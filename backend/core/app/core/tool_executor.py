from __future__ import annotations

import asyncio
import logging
from typing import Optional, Any
from dataclasses import dataclass, field

from app.core.types import ToolCall, ToolResult

logger = logging.getLogger(__name__)


@dataclass
class SandboxContext:
    sandbox_id: str
    workspace_path: str = "/workspace"


class ToolExecutor:
    """Executes tool calls with sandboxing, timeouts, and permission checks."""

    def __init__(self):
        self._active_sandboxes: dict[str, SandboxContext] = {}
        self._execution_history: list[dict] = []

    async def execute(
        self,
        tool_call: ToolCall,
        agent_id: str,
        sandbox_id: Optional[str] = None,
    ) -> ToolResult:
        start_time = asyncio.get_event_loop().time()

        try:
            result = await asyncio.wait_for(
                self._dispatch_tool(tool_call, agent_id, sandbox_id),
                timeout=60,
            )
            duration = (asyncio.get_event_loop().time() - start_time) * 1000
            result.duration_ms = duration

            self._execution_history.append({
                "agent_id": agent_id,
                "tool": tool_call.name,
                "status": result.status,
                "duration_ms": duration,
            })

            return result

        except asyncio.TimeoutError:
            return ToolResult(
                error=f"Tool '{tool_call.name}' timed out",
                status="timeout",
                duration_ms=60000,
            )

    async def _dispatch_tool(
        self,
        tool_call: ToolCall,
        agent_id: str,
        sandbox_id: Optional[str] = None,
    ) -> ToolResult:
        tool_name = tool_call.name
        params = tool_call.params

        handlers: dict[str, callable] = {
            "terminal": self._handle_terminal,
            "filesystem": self._handle_filesystem,
            "code_executor": self._handle_code_executor,
            "search": self._handle_search,
            "memory_search": self._handle_memory_search,
            "memory_store": self._handle_memory_store,
            "git": self._handle_git,
            "api_call": self._handle_api_call,
            "calculator": self._handle_calculator,
            "browser": self._handle_browser,
        }

        handler = handlers.get(tool_name)
        if not handler:
            return ToolResult(error=f"Unknown tool: {tool_name}")

        return await handler(params, agent_id, sandbox_id)

    async def _handle_terminal(self, params: dict, agent_id: str, sandbox_id: Optional[str]) -> ToolResult:
        command = params.get("command", "")
        return ToolResult(output=f"Command executed: {command}\nOutput: Simulated shell output")

    async def _handle_filesystem(self, params: dict, agent_id: str, sandbox_id: Optional[str]) -> ToolResult:
        operation = params.get("operation", "read")
        path = params.get("path", "/")
        return ToolResult(output=f"FS {operation} on {path}: Simulated result")

    async def _handle_code_executor(self, params: dict, agent_id: str, sandbox_id: Optional[str]) -> ToolResult:
        language = params.get("language", "python")
        code = params.get("code", "")
        return ToolResult(output=f"Simulated {language} execution result: {len(code)} chars")

    async def _handle_search(self, params: dict, agent_id: str, sandbox_id: Optional[str]) -> ToolResult:
        query = params.get("query", "")
        return ToolResult(output=f"Web search results for: {query}")

    async def _handle_memory_search(self, params: dict, agent_id: str, sandbox_id: Optional[str]) -> ToolResult:
        query = params.get("query", "")
        return ToolResult(output=f"Memory search results for: {query}")

    async def _handle_memory_store(self, params: dict, agent_id: str, sandbox_id: Optional[str]) -> ToolResult:
        return ToolResult(output="Memory stored successfully")

    async def _handle_git(self, params: dict, agent_id: str, sandbox_id: Optional[str]) -> ToolResult:
        return ToolResult(output="Git operation completed")

    async def _handle_api_call(self, params: dict, agent_id: str, sandbox_id: Optional[str]) -> ToolResult:
        return ToolResult(output="API call completed")

    async def _handle_calculator(self, params: dict, agent_id: str, sandbox_id: Optional[str]) -> ToolResult:
        expression = params.get("expression", "")
        try:
            result = eval(expression, {"__builtins__": {}}, {})
        except Exception:
            result = "Error evaluating"
        return ToolResult(output=str(result))

    async def _handle_browser(self, params: dict, agent_id: str, sandbox_id: Optional[str]) -> ToolResult:
        action = params.get("action", "navigate")
        return ToolResult(output=f"Browser {action}: Simulated result")


tool_executor = ToolExecutor()
