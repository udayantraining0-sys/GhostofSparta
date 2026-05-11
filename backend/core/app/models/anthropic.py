from __future__ import annotations

import json
import logging
from typing import Optional, AsyncIterator, Any

from anthropic import AsyncAnthropic

from app.models.base import (
    BaseProvider, Message, ToolDefinition, LLMResponse, LLMChunk,
)

logger = logging.getLogger(__name__)

PRICING: dict[str, tuple[float, float]] = {
    "claude-sonnet-4-20250514": (3.00, 15.00),
    "claude-opus-4-20250514": (15.00, 75.00),
    "claude-3-5-sonnet-20241022": (3.00, 15.00),
    "claude-3-5-haiku-20241022": (0.80, 4.00),
}


def _messages_to_anthropic(messages: list[Message]) -> tuple[Optional[str], list[dict]]:
    system_parts: list[str] = []
    converted: list[dict] = []

    for msg in messages:
        if msg.role == "system":
            if isinstance(msg.content, str):
                system_parts.append(msg.content)
            elif isinstance(msg.content, list):
                for block in msg.content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        system_parts.append(block["text"])
            continue

        if msg.role == "tool":
            converted.append({
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": msg.tool_call_id or "",
                        "content": msg.content if isinstance(msg.content, str) else json.dumps(msg.content),
                    }
                ],
            })
            continue

        content_blocks: list[dict] = []
        if isinstance(msg.content, str):
            content_blocks.append({"type": "text", "text": msg.content})
        elif isinstance(msg.content, list):
            content_blocks = msg.content

        if msg.role == "assistant" and msg.tool_calls:
            tool_blocks: list[dict] = []
            for tc in msg.tool_calls:
                tool_blocks.append({
                    "type": "tool_use",
                    "id": tc.get("id", ""),
                    "name": tc.get("function", {}).get("name", ""),
                    "input": json.loads(tc.get("function", {}).get("arguments", "{}")),
                })
            content_blocks = content_blocks + tool_blocks

        role = "assistant" if msg.role == "assistant" else "user"
        converted.append({"role": role, "content": content_blocks})

    system = "\n\n".join(system_parts) if system_parts else None
    return system, converted


def _tools_to_anthropic(tools: Optional[list[ToolDefinition]]) -> Optional[list[dict]]:
    if not tools:
        return None
    return [
        {
            "name": t.name,
            "description": t.description,
            "input_schema": t.parameters,
        }
        for t in tools
    ]


class AnthropicProvider(BaseProvider):
    provider_name = "anthropic"

    def __init__(self, api_key: str, base_url: str = "https://api.anthropic.com"):
        self.client = AsyncAnthropic(api_key=api_key, base_url=base_url)
        self.api_key = api_key

    async def chat_completion(
        self,
        messages: list[Message],
        model: str,
        tools: Optional[list[ToolDefinition]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        system, converted = _messages_to_anthropic(messages)
        anthropic_tools = _tools_to_anthropic(tools)

        kwargs: dict[str, Any] = {
            "model": model,
            "messages": converted,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if system:
            kwargs["system"] = system
        if anthropic_tools:
            kwargs["tools"] = anthropic_tools

        response = await self.client.messages.create(**kwargs)

        text_content = ""
        tool_calls: list[dict] = []
        prompt_tokens = response.usage.input_tokens if response.usage else 0
        completion_tokens = response.usage.output_tokens if response.usage else 0

        for block in response.content:
            if block.type == "text":
                text_content += block.text
            elif block.type == "tool_use":
                tool_calls.append({
                    "id": block.id,
                    "function": {
                        "name": block.name,
                        "arguments": json.dumps(block.input),
                    },
                })

        return LLMResponse(
            content=text_content,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            tool_calls=tool_calls,
            finish_reason=response.stop_reason or "stop",
        )

    async def stream_completion(
        self,
        messages: list[Message],
        model: str,
        tools: Optional[list[ToolDefinition]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncIterator[LLMChunk]:
        system, converted = _messages_to_anthropic(messages)
        anthropic_tools = _tools_to_anthropic(tools)

        kwargs: dict[str, Any] = {
            "model": model,
            "messages": converted,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if system:
            kwargs["system"] = system
        if anthropic_tools:
            kwargs["tools"] = anthropic_tools

        accumulated_tool_calls: dict[int, dict] = {}
        current_block_index = -1

        async with self.client.messages.stream(**kwargs) as stream:
            async for event in stream:
                if event.type == "content_block_start":
                    current_block_index = (current_block_index or 0)

                    if event.content_block and hasattr(event.content_block, 'type'):
                        if event.content_block.type == "tool_use":
                            tool_block = event.content_block
                            accumulated_tool_calls[tool_block.index or current_block_index] = {
                                "id": tool_block.id or "",
                                "function": {"name": str(tool_block.name), "arguments": ""},
                            }
                            yield LLMChunk(tool_calls=list(accumulated_tool_calls.values()))

                elif event.type == "content_block_delta":
                    if event.delta:
                        if hasattr(event.delta, 'text') and event.delta.text:
                            yield LLMChunk(content=event.delta.text)
                        elif hasattr(event.delta, 'partial_json') and event.delta.partial_json:
                            idx = current_block_index
                            if idx in accumulated_tool_calls:
                                accumulated_tool_calls[idx]["function"]["arguments"] += event.delta.partial_json
                            yield LLMChunk(tool_calls=list(accumulated_tool_calls.values()))

                elif event.type == "message_delta":
                    yield LLMChunk(
                        finish_reason=event.delta.stop_reason if event.delta else "stop"
                    )

    async def is_available(self) -> bool:
        try:
            await self.client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=1,
                messages=[{"role": "user", "content": "ping"}],
            )
            return True
        except Exception:
            return False

    def estimate_tokens(self, messages: list[Message], tools: Optional[list[ToolDefinition]] = None) -> int:
        total = 0
        for msg in messages:
            if isinstance(msg.content, str):
                total += int(len(msg.content) * 0.3)
            else:
                total += int(json.dumps(msg.content).__len__() * 0.3)
        if tools:
            total += int(json.dumps(_tools_to_anthropic(tools) or []).__len__() * 0.3)
        return total + 50

    def estimate_cost(self, messages: list[Message], model: str, completion_tokens: int = 1024) -> float:
        prompt_tokens = self.estimate_tokens(messages)
        pricing = PRICING.get(model, (3.0, 15.0))
        return (prompt_tokens / 1_000_000) * pricing[0] + (completion_tokens / 1_000_000) * pricing[1]
