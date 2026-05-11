from __future__ import annotations

import logging
from typing import Optional, AsyncIterator

from openai import AsyncOpenAI

from app.models.base import (
    BaseProvider, Message, ToolDefinition, LLMResponse, LLMChunk,
)

logger = logging.getLogger(__name__)


class GroqProvider(BaseProvider):
    provider_name = "groq"

    def __init__(self, api_key: str, base_url: str = "https://api.groq.com/openai/v1"):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.api_key = api_key

    async def chat_completion(
        self,
        messages: list[Message],
        model: str,
        tools: Optional[list[ToolDefinition]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        kwargs = {
            "model": model,
            "messages": self._messages_to_dicts(messages),
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools and self._model_supports_tools(model):
            kwargs["tools"] = self._tools_to_openai_format(tools)

        response = await self.client.chat.completions.create(**kwargs)
        choice = response.choices[0]

        return LLMResponse(
            content=choice.message.content or "",
            model=model,
            prompt_tokens=response.usage.prompt_tokens if response.usage else 0,
            completion_tokens=response.usage.completion_tokens if response.usage else 0,
            finish_reason=choice.finish_reason or "stop",
        )

    async def stream_completion(
        self,
        messages: list[Message],
        model: str,
        tools: Optional[list[ToolDefinition]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncIterator[LLMChunk]:
        kwargs = {
            "model": model,
            "messages": self._messages_to_dicts(messages),
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        if tools and self._model_supports_tools(model):
            kwargs["tools"] = self._tools_to_openai_format(tools)

        stream = await self.client.chat.completions.create(**kwargs)

        async for chunk in stream:
            if not chunk.choices:
                continue

            delta = chunk.choices[0].delta
            finish_reason = chunk.choices[0].finish_reason

            yield LLMChunk(
                content=delta.content or "",
                finish_reason=finish_reason,
            )

    def _model_supports_tools(self, model: str) -> bool:
        tool_supporting = [
            "llama-4-scout", "llama-4-maverick", "mixtral",
            "gemma2", "llama-3.3", "qwen",
        ]
        return any(prefix in model.lower() for prefix in tool_supporting)

    async def is_available(self) -> bool:
        try:
            response = await self.client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=1,
            )
            return len(response.choices) > 0
        except Exception:
            return False

    def estimate_tokens(self, messages: list[Message], tools: Optional[list[ToolDefinition]] = None) -> int:
        total = 0
        for msg in messages:
            content = msg.content if isinstance(msg.content, str) else str(msg.content)
            total += int(len(content) * 0.25) + 4
        return total + 100

    def estimate_cost(self, messages: list[Message], model: str, completion_tokens: int = 1024) -> float:
        groq_pricing = {
            "llama-4-scout-17b-16e": (0.0, 0.0),
            "llama-4-maverick-17b-128e": (0.01, 0.01),
            "llama-3.1-8b-instant": (0.0, 0.0),
            "mixtral-8x7b-32768": (0.0, 0.0),
        }
        prompt_tokens = self.estimate_tokens(messages)
        pricing = groq_pricing.get(model, (0.05, 0.15))
        return (prompt_tokens / 1_000_000) * pricing[0] + (completion_tokens / 1_000_000) * pricing[1]
