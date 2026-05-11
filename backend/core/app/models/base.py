from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional, AsyncIterator, Any
from dataclasses import dataclass, field
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class Message:
    role: str
    content: str | list[dict]
    name: Optional[str] = None
    tool_call_id: Optional[str] = None
    tool_calls: Optional[list[dict]] = None


@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: dict[str, Any] = field(default_factory=dict)


@dataclass
class LLMResponse:
    content: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    tool_calls: list[dict] = field(default_factory=list)
    finish_reason: str = "stop"


@dataclass
class LLMChunk:
    content: str = ""
    tool_calls: list[dict] = field(default_factory=list)
    finish_reason: Optional[str] = None


APPROX_TOKENS_PER_CHAR = 0.25


class BaseProvider(ABC):
    provider_name: str

    @abstractmethod
    async def chat_completion(
        self,
        messages: list[Message],
        model: str,
        tools: Optional[list[ToolDefinition]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        ...
    @abstractmethod

    async def stream_completion(
        self,
        messages: list[Message],
        model: str,
        tools: Optional[list[ToolDefinition]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncIterator[LLMChunk]:
        ...

    @abstractmethod
    async def is_available(self) -> bool:
        ...

    @abstractmethod
    def estimate_tokens(self, messages: list[Message], tools: Optional[list[ToolDefinition]] = None) -> int:
        ...

    def estimate_cost(self, messages: list[Message], model: str, completion_tokens: int = 1024) -> float:
        return 0.0

    def _messages_to_dicts(self, messages: list[Message]) -> list[dict]:
        result = []
        for msg in messages:
            d: dict = {"role": msg.role}
            if isinstance(msg.content, str):
                d["content"] = msg.content
            else:
                d["content"] = msg.content
            if msg.name:
                d["name"] = msg.name
            if msg.tool_call_id:
                d["tool_call_id"] = msg.tool_call_id
            if msg.tool_calls:
                d["tool_calls"] = msg.tool_calls
            result.append(d)
        return result

    def _tools_to_openai_format(self, tools: Optional[list[ToolDefinition]]) -> Optional[list[dict]]:
        if not tools:
            return None
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters,
                },
            }
            for t in tools
        ]
