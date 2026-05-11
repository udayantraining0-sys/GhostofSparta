from __future__ import annotations

import json
import logging
from typing import Optional, AsyncIterator, Any

from openai import AsyncOpenAI

from app.models.base import (
    BaseProvider, Message, ToolDefinition, LLMResponse, LLMChunk,
)

logger = logging.getLogger(__name__)

PRICING: dict[str, tuple[float, float]] = {
    "gpt-4o": (5.00, 15.00),
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4-turbo": (10.00, 30.00),
    "gpt-4.1-nano": (0.10, 0.40),
    "gpt-4.1-mini": (0.40, 1.60),
    "gpt-4.1": (2.00, 8.00),
    "o3-mini": (1.10, 4.40),
    "o1": (15.00, 60.00),
    "o1-mini": (1.10, 4.40),
    "text-embedding-3-large": (0.13, 0.0),
    "text-embedding-3-small": (0.02, 0.0),
}


class OpenAIProvider(BaseProvider):
    provider_name = "openai"

    def __init__(self, api_key: str, base_url: str = "https://api.openai.com/v1"):
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
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": self._messages_to_dicts(messages),
            "temperature": temperature,
            "max_tokens": max_tokens,
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
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": self._messages_to_dicts(messages),
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
            "stream_options": {"include_usage": True},
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
            models = await self.client.models.list()
            return len(models.data) > 0
        except Exception:
            return False

    def estimate_tokens(self, messages: list[Message], tools: Optional[list[ToolDefinition]] = None) -> int:
        total = 0
        for msg in messages:
            if isinstance(msg.content, str):
                total += int(len(msg.content) * 0.25) + 4
            else:
                total += int(json.dumps(msg.content).__len__() * 0.25) + 4
        if tools:
            total += int(json.dumps(self._tools_to_openai_format(tools)).__len__() * 0.25) if self._tools_to_openai_format(tools) else 0
        return total + 100

    def estimate_cost(self, messages: list[Message], model: str, completion_tokens: int = 1024) -> float:
        prompt_tokens = self.estimate_tokens(messages)
        pricing = PRICING.get(model, (1.0, 4.0))
        return (prompt_tokens / 1_000_000) * pricing[0] + (completion_tokens / 1_000_000) * pricing[1]
