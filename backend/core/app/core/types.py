from __future__ import annotations

from enum import Enum
from dataclasses import dataclass, field
from typing import Any, Optional, Callable, Awaitable
from abc import ABC, abstractmethod


class AgentState(str, Enum):
    IDLE = "idle"
    PLANNING = "planning"
    EXECUTING = "executing"
    OBSERVING = "observing"
    REFLECTING = "reflecting"
    PAUSED = "paused"
    STOPPED = "stopped"
    ERROR = "error"
    COMPLETED = "completed"


class AgentType(str, Enum):
    RESEARCHER = "researcher"
    CODER = "coder"
    PLANNER = "planner"
    EXECUTOR = "executor"
    BROWSER = "browser_agent"
    MEMORY = "memory_agent"


class ThoughtType(str, Enum):
    PLANNING = "planning"
    ACTION = "action"
    OBSERVATION = "observation"
    REFLECTION = "reflection"
    FINAL = "final"


@dataclass
class ToolCall:
    name: str
    params: dict[str, Any]
    execution_id: str = ""


@dataclass
class ToolResult:
    output: Optional[str] = None
    error: Optional[str] = None
    status: str = "success"
    duration_ms: float = 0


@dataclass
class AgentThought:
    step: int
    thought_type: ThoughtType
    content: str
    tool_name: Optional[str] = None
    tool_input: Optional[dict] = None
    tool_result: Optional[ToolResult] = None
    model_used: str = ""


@dataclass
class AgentTask:
    task_id: str
    goal: str
    context: dict[str, Any] = field(default_factory=dict)
    tools: list[str] = field(default_factory=list)
    max_iterations: int = 20


@dataclass
class TaskResult:
    success: bool
    summary: str
    thoughts: list[AgentThought] = field(default_factory=list)
    error: Optional[str] = None


@dataclass
class AgentInstance:
    agent_id: str
    agent_type: AgentType
    name: str
    state: AgentState = AgentState.IDLE
    current_task: Optional[AgentTask] = None
    thoughts: list[AgentThought] = field(default_factory=list)
    model: str = "claude-sonnet-4-20250514"
    sandbox_id: Optional[str] = None
    memory_context: list[dict] = field(default_factory=list)
    created_at: str = ""
    stopped_at: Optional[str] = None


class ToolDefinition(ABC):
    name: str
    description: str
    parameters: dict[str, Any]
    requires_sandbox: bool = False
    max_runtime_seconds: int = 60

    @abstractmethod
    async def execute(self, params: dict, context: dict) -> ToolResult:
        ...


class ModelProvider(ABC):
    provider_name: str
    models: list[str]

    @abstractmethod
    async def chat_completion(
        self,
        messages: list[dict],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> dict:
        ...

    @abstractmethod
    async def stream_completion(
        self,
        messages: list[dict],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ):
        ...


EventHandler = Callable[[str, dict[str, Any]], Awaitable[None]]
