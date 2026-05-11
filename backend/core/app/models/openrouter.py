from __future__ import annotations

import logging
from typing import Optional, AsyncIterator

from openai import AsyncOpenAI

from app.models.base import (
    BaseProvider, Message, ToolDefinition, LLMResponse, LLMChunk,
)
from app.models.openai import PRICING as OPENAI_PRICING

logger = logging.getLogger(__name__)


class OpenRouterProvider(BaseProvider):
    provider_name = "openrouter"

    def __init__(self, api_key: str, base_url: str = "https://openrouter.ai/api/v1"):
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
            "extra_headers": {
                "HTTP-Referer": "https://kratos.ai",
                "X-Title": "KRATOS Agentic OS",
            },
        }
        if tools:
            kwargs["tools"] = self._tools_to_openai_format(tools)

        response = await self.client.chat.completions.create(**kwargs)
        choice = response.choices[0]

        tool_calls = []
        if choice.message.tool_calls:
            tool_calls = [
                {
                    "id": tc.id,
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in choice.message.tool_calls
            ]

        return LLMResponse(
            content=choice.message.content or "",
            model=model,
            prompt_tokens=response.usage.prompt_tokens if response.usage else 0,
            completion_tokens=response.usage.completion_tokens if response.usage else 0,
            tool_calls=tool_calls,
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
            "extra_headers": {
                "HTTP-Referer": "https://kratos.ai",
                "X-Title": "KRATOS Agentic OS",
            },
        }
        if tools:
            kwargs["tools"] = self._tools_to_openai_format(tools)

        stream = await self.client.chat.completions.create(**kwargs)
        accumulated_tool_calls: dict[int, dict] = {}

        async for chunk in stream:
            if not chunk.choices:
                continue

            delta = chunk.choices[0].delta
            finish_reason = chunk.choices[0].finish_reason
            content = ""
            tool_calls_list: list[dict] = []

            if delta.content:
                content = delta.content

            if delta.tool_calls:
                for tc in delta.tool_calls:
                    idx = tc.index or 0
                    if idx not in accumulated_tool_calls:
                        accumulated_tool_calls[idx] = {
                            "id": tc.id or "",
                            "function": {"name": "", "arguments": ""},
                        }
                    if tc.id:
                        accumulated_tool_calls[idx]["id"] = tc.id
                    if tc.function:
                        if tc.function.name:
                            accumulated_tool_calls[idx]["function"]["name"] += tc.function.name
                        if tc.function.arguments:
                            accumulated_tool_calls[idx]["function"]["arguments"] += tc.function.arguments
                tool_calls_list = list(accumulated_tool_calls.values())

            yield LLMChunk(
                content=content,
                tool_calls=tool_calls_list,
                finish_reason=finish_reason,
            )

    async def is_available(self) -> bool:
        try:
            response = await self.client.chat.completions.create(
                model="openai/gpt-4.1-nano",
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
        prompt_tokens = self.estimate_tokens(messages)
        pricing = OPENAI_PRICING.get(model, (1.0, 4.0))
        return (prompt_tokens / 1_000_000) * pricing[0] + (completion_tokens / 1_000_000) * pricing[1]
