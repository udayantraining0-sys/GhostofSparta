from __future__ import annotations

import json
import uuid
import asyncio
import logging
from typing import Optional, Any
from datetime import datetime

from app.core.types import (
    AgentState, AgentType, ThoughtType, AgentThought,
    AgentTask, TaskResult, AgentInstance, ToolCall, ToolResult,
)
from app.core.prompt_compiler import prompt_compiler
from app.core.model_router import model_router
from app.core.tool_executor import tool_executor
from app.core.event_bus import event_bus
from app.memory.short_term import short_term_memory
from app.models.base import Message, ToolDefinition
from app.models.provider_factory import ProviderFactory

logger = logging.getLogger(__name__)


class AgentEngine:
    """Full ReAct agent lifecycle manager with real LLM integration."""

    def __init__(self):
        self._agents: dict[str, AgentInstance] = {}
        self._agent_tasks: dict[str, asyncio.Task] = {}

    def create_agent(
        self,
        agent_type: AgentType,
        name: str,
        task: Optional[AgentTask] = None,
        model: Optional[str] = None,
    ) -> AgentInstance:
        config = PROMPT_CONFIGS.get(agent_type, PROMPT_CONFIGS[AgentType.EXECUTOR])
        agent = AgentInstance(
            agent_id=str(uuid.uuid4()),
            agent_type=agent_type,
            name=name,
            model=model or config["preferred_model"],
            current_task=task,
            created_at=datetime.utcnow().isoformat(),
        )
        self._agents[agent.agent_id] = agent
        logger.info(f"Agent created: {agent.agent_id} ({agent_type.value}) - {name}")
        return agent

    async def execute(self, agent_id: str, task: Optional[AgentTask] = None) -> TaskResult:
        agent = self._agents.get(agent_id)
        if not agent:
            return TaskResult(success=False, summary="Agent not found", error="Agent not found")

        if task:
            agent.current_task = task

        if not agent.current_task:
            return TaskResult(success=False, summary="No task assigned", error="No task")

        task_ref = agent.current_task
        config = PROMPT_CONFIGS.get(agent.agent_type, PROMPT_CONFIGS[AgentType.EXECUTOR])
        max_iter = min(task_ref.max_iterations, config["max_iterations"])

        await self._set_state(agent, AgentState.PLANNING)

        system_prompt = prompt_compiler.build_system_prompt(
            agent.agent_type.value,
            active_tools=config.get("tools"),
        )
        task_prompt = prompt_compiler.build_task_prompt(task_ref.goal, agent.agent_type.value)

        messages: list[Message] = [
            Message(role="system", content=system_prompt),
            Message(role="user", content=task_prompt),
        ]

        agent.thoughts.append(AgentThought(
            step=0,
            thought_type=ThoughtType.PLANNING,
            content=f"Planning execution for: {task_ref.goal}",
            model_used=agent.model,
        ))
        await event_bus.agent_thought(agent.agent_id, 0, "planning", f"Planning execution for: {task_ref.goal}")
        await short_term_memory.store_message(agent.agent_id, messages[-1])

        for step in range(1, max_iter + 1):
            await self._set_state(agent, AgentState.EXECUTING)

            try:
                response = await model_router.route_completion(
                    task_type=agent.agent_type.value,
                    messages=messages,
                    tools=self._get_tool_definitions(config.get("tools", [])),
                    temperature=0.7,
                    max_tokens=4096,
                )
            except Exception as e:
                logger.error(f"Model routing failed for agent {agent.agent_id}: {e}")
                await event_bus.task_failed(agent.agent_id, task_ref.task_id, str(e))
                return TaskResult(success=False, summary="Model routing failed", error=str(e))

            assistant_msg = Message(role="assistant", content=response.content)

            if response.tool_calls:
                assistant_msg.tool_calls = response.tool_calls

                for tc in response.tool_calls:
                    tool_name = tc.get("function", {}).get("name", "")
                    tool_args_str = tc.get("function", {}).get("arguments", "{}")
                    try:
                        tool_args = json.loads(tool_args_str)
                    except json.JSONDecodeError:
                        tool_args = {}

                    execution_id = str(uuid.uuid4())
                    await event_bus.tool_started(agent.agent_id, tool_name, tool_args, execution_id)

                    thought = AgentThought(
                        step=step,
                        thought_type=ThoughtType.ACTION,
                        content=f"Calling tool: {tool_name}",
                        tool_name=tool_name,
                        tool_input=tool_args,
                        model_used=response.model,
                    )
                    agent.thoughts.append(thought)
                    await event_bus.agent_thought(agent.agent_id, step, "action", f"Calling tool: {tool_name}")

                    try:
                        result = await tool_executor.execute(
                            ToolCall(name=tool_name, params=tool_args, execution_id=execution_id),
                            agent.agent_id,
                            agent.sandbox_id,
                        )
                    except Exception as tool_err:
                        result = ToolResult(error=str(tool_err), status="error")

                    if result.error:
                        await event_bus.tool_failed(agent.agent_id, tool_name, result.error, execution_id)
                        tool_result_content = f"Error: {result.error}"
                    else:
                        await event_bus.tool_completed(
                            agent.agent_id, tool_name, result.output or "", execution_id, result.duration_ms
                        )
                        tool_result_content = result.output or "Tool executed successfully"

                    messages.append(assistant_msg)
                    messages.append(Message(role="tool", content=tool_result_content, tool_call_id=tc.get("id", "")))

                    await short_term_memory.store_tool_result(agent.agent_id, tool_name, tool_result_content)

                    thought.tool_result = result
                    await event_bus.agent_thought(
                        agent.agent_id, step, "observation",
                        f"Tool {tool_name} result: {tool_result_content[:200]}",
                    )
            else:
                messages.append(assistant_msg)
                await short_term_memory.store_message(agent.agent_id, assistant_msg)

                thought = AgentThought(
                    step=step,
                    thought_type=ThoughtType.OBSERVATION,
                    content=response.content,
                    model_used=response.model,
                )
                agent.thoughts.append(thought)
                await event_bus.agent_thought(agent.agent_id, step, "observation", response.content[:200])

                # Check if task appears complete
                if response.finish_reason == "stop" and step > 1:
                    break

            await short_term_memory.store_message(agent.agent_id, messages[-1])

        # Finalize
        await self._set_state(agent, AgentState.COMPLETED)
        summary = f"Task completed in {len(agent.thoughts)} steps: {task_ref.goal}"

        agent.thoughts.append(AgentThought(
            step=len(agent.thoughts),
            thought_type=ThoughtType.FINAL,
            content=summary,
            model_used=agent.model,
        ))

        await event_bus.task_completed(agent.agent_id, task_ref.task_id, summary)

        return TaskResult(
            success=True,
            summary=summary,
            thoughts=agent.thoughts,
        )

    async def pause(self, agent_id: str) -> None:
        agent = self._agents.get(agent_id)
        if agent and agent.state != AgentState.PAUSED:
            await self._set_state(agent, AgentState.PAUSED)

    async def resume(self, agent_id: str) -> None:
        agent = self._agents.get(agent_id)
        if agent and agent.state == AgentState.PAUSED:
            await self._set_state(agent, AgentState.IDLE)

    async def stop(self, agent_id: str) -> None:
        agent = self._agents.get(agent_id)
        if agent:
            await self._set_state(agent, AgentState.STOPPED)
            if agent_id in self._agent_tasks:
                self._agent_tasks[agent_id].cancel()

    async def _set_state(self, agent: AgentInstance, new_state: AgentState) -> None:
        old_state = agent.state
        agent.state = new_state
        await event_bus.agent_state_changed(agent.agent_id, str(old_state), str(new_state))

    def _get_tool_definitions(self, tool_names: list[str]) -> list[ToolDefinition]:
        from app.api.v1.tools import TOOLS_DEFINITIONS
        result = []
        for name in tool_names:
            for t in TOOLS_DEFINITIONS:
                if t["name"] == name:
                    result.append(ToolDefinition(
                        name=t["name"],
                        description=t["description"],
                        parameters=t["parameters"],
                    ))
        return result

    def get_agent(self, agent_id: str) -> Optional[AgentInstance]:
        return self._agents.get(agent_id)

    def list_agents(self) -> list[AgentInstance]:
        return list(self._agents.values())


PROMPT_CONFIGS: dict[AgentType, dict] = {
    AgentType.RESEARCHER: {
        "tools": ["search", "memory_search", "memory_store", "api_call"],
        "preferred_model": "o3-mini",
        "max_iterations": 15,
    },
    AgentType.CODER: {
        "tools": ["terminal", "filesystem", "code_executor", "git", "search"],
        "preferred_model": "claude-sonnet-4-20250514",
        "max_iterations": 25,
    },
    AgentType.PLANNER: {
        "tools": ["search", "memory_search", "calculator"],
        "preferred_model": "o3-mini",
        "max_iterations": 10,
    },
    AgentType.EXECUTOR: {
        "tools": ["terminal", "browser", "filesystem", "api_call"],
        "preferred_model": "claude-sonnet-4-20250514",
        "max_iterations": 20,
    },
    AgentType.BROWSER: {
        "tools": ["browser", "search"],
        "preferred_model": "claude-sonnet-4-20250514",
        "max_iterations": 30,
    },
    AgentType.MEMORY: {
        "tools": ["memory_search", "memory_store"],
        "preferred_model": "gpt-4.1-nano",
        "max_iterations": 10,
    },
}


agent_engine = AgentEngine()
