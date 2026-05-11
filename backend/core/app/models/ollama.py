from __future__ import annotations

import logging
from typing import Optional, AsyncIterator

from openai import AsyncOpenAI

from app.models.base import (
    BaseProvider, Message, ToolDefinition, LLMResponse, LLMChunk,
)

logger = logging.getLogger(__name__)


class OllamaProvider(BaseProvider):
    provider_name = "ollama"

    def __init__(self, api_key: str = "", base_url: str = "http://localhost:11434/v1"):
        self.client = AsyncOpenAI(api_key=api_key or "ollama", base_url=base_url)
        self.base_url = base_url

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
        if tools:
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
        if tools:
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

    async def is_available(self) -> bool:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url.replace('/v1', '')}/api/tags")
                return response.status_code == 200
        except Exception:
            return False

    def estimate_tokens(self, messages: list[Message], tools: Optional[list[ToolDefinition]] = None) -> int:
        total = 0
        for msg in messages:
            content = msg.content if isinstance(msg.content, str) else str(msg.content)
            total += int(len(content) * 0.25) + 4
        return total + 100

    def estimate_cost(self, messages: list[Message], model: str, completion_tokens: int = 1024) -> float:
        return 0.0  # Local models are free
