from __future__ import annotations

import uuid
import asyncio
import logging
from typing import Optional, Any
from dataclasses import dataclass, field
from datetime import datetime

from app.core.agent_engine import agent_engine, AgentEngine
from app.core.types import AgentState, AgentType, AgentTask, TaskResult, AgentInstance
from app.core.event_bus import event_bus
from app.core.prompt_compiler import prompt_compiler

logger = logging.getLogger(__name__)


@dataclass
class SubTask:
    task_id: str
    goal: str
    agent_type: AgentType
    dependencies: list[str] = field(default_factory=list)
    context: dict[str, Any] = field(default_factory=dict)
    status: str = "pending"  # pending, running, completed, failed


@dataclass
class MissionPlan:
    mission_id: str
    goal: str
    subtasks: list[SubTask]
    parallel_groups: list[list[str]]  # groups of task IDs that can run in parallel


@dataclass
class MissionResult:
    mission_id: str
    success: bool
    summary: str
    subtask_results: dict[str, TaskResult] = field(default_factory=dict)
    error: Optional[str] = None


class AgentOrchestrator:
    def __init__(self):
        self._missions: dict[str, dict] = {}
        self._engine: AgentEngine = agent_engine

    async def plan_and_execute(
        self,
        goal: str,
        available_agent_types: Optional[list[AgentType]] = None,
    ) -> MissionResult:
        mission_id = str(uuid.uuid4())
        await event_bus.publish(f"events:mission:{mission_id}", "mission.started", {
            "mission_id": mission_id, "goal": goal,
        })

        # Phase 1: Planning
        plan = await self._create_plan(mission_id, goal, available_agent_types)

        self._missions[mission_id] = {
            "id": mission_id,
            "goal": goal,
            "plan": plan,
            "status": "active",
            "started_at": datetime.utcnow().isoformat(),
            "results": {},
        }

        await event_bus.publish(f"events:mission:{mission_id}", "mission.milestone", {
            "mission_id": mission_id,
            "description": f"Plan created: {len(plan.subtasks)} subtasks, {len(plan.parallel_groups)} parallel groups",
        })

        # Phase 2: Execute in parallel groups
        subtask_results: dict[str, TaskResult] = {}

        for group_idx, group in enumerate(plan.parallel_groups):
            group_tasks = []

            for subtask_id in group:
                subtask = next((s for s in plan.subtasks if s.task_id == subtask_id), None)
                if not subtask:
                    continue

                # Wait for dependencies
                for dep_id in subtask.dependencies:
                    if dep_id in subtask_results:
                        dep_result = subtask_results[dep_id]
                        subtask.context["dependency_results"] = {
                            dep_id: dep_result.summary
                        }
                    else:
                        logger.warning(f"Dependency {dep_id} not complete for {subtask_id}")

                task = AgentTask(
                    task_id=subtask.task_id,
                    goal=subtask.goal,
                    context=subtask.context,
                )

                subtask.status = "running"
                agent = self._engine.create_agent(
                    agent_type=subtask.agent_type,
                    name=f"Mission Agent ({subtask.agent_type.value})",
                    task=task,
                )

                group_tasks.append(asyncio.create_task(
                    self._execute_subtask_agent(mission_id, agent, subtask)
                ))

            results = await asyncio.gather(*group_tasks, return_exceptions=True)

            for subtask, result in zip(
                [s for s in plan.subtasks if s.task_id in group],
                results,
            ):
                if isinstance(result, Exception):
                    subtask.status = "failed"
                    subtask_results[subtask.task_id] = TaskResult(
                        success=False,
                        summary=f"Failed: {result}",
                        error=str(result),
                    )
                else:
                    subtask.status = "completed"
                    subtask_results[subtask.task_id] = result

            await event_bus.publish(f"events:mission:{mission_id}", "mission.milestone", {
                "mission_id": mission_id,
                "description": f"Parallel group {group_idx + 1}/{len(plan.parallel_groups)} completed",
            })

        # Phase 3: Synthesize
        summary = await self._synthesize_results(mission_id, plan, subtask_results)

        self._missions[mission_id]["status"] = "completed"
        self._missions[mission_id]["results"] = subtask_results

        await event_bus.publish(f"events:mission:{mission_id}", "mission.completed", {
            "mission_id": mission_id,
            "summary": summary,
        })

        return MissionResult(
            mission_id=mission_id,
            success=True,
            summary=summary,
            subtask_results=subtask_results,
        )

    async def _execute_subtask_agent(
        self,
        mission_id: str,
        agent: AgentInstance,
        subtask: SubTask,
    ) -> TaskResult:
        try:
            task = AgentTask(
                task_id=subtask.task_id,
                goal=subtask.goal,
                context=subtask.context,
                max_iterations=10,
            )
            return await self._engine.execute(agent.agent_id, task)
        except Exception as e:
            logger.error(f"Subtask {subtask.task_id} failed: {e}")
            return TaskResult(success=False, summary="Failed", error=str(e))

    async def _create_plan(
        self,
        mission_id: str,
        goal: str,
        available_types: Optional[list[AgentType]] = None,
    ) -> MissionPlan:
        types = available_types or [AgentType.CODER, AgentType.RESEARCHER, AgentType.EXECUTOR]

        subtasks: list[SubTask] = []
        parallel_groups: list[list[str]] = []

        research_id = str(uuid.uuid4())
        subtasks.append(SubTask(
            task_id=research_id,
            goal=f"Research and analyze: {goal}",
            agent_type=AgentType.RESEARCHER,
        ))

        code_id = str(uuid.uuid4())
        subtasks.append(SubTask(
            task_id=code_id,
            goal=f"Implement solution based on research for: {goal}",
            agent_type=AgentType.CODER,
            dependencies=[research_id],
        ))

        test_id = str(uuid.uuid4())
        subtasks.append(SubTask(
            task_id=test_id,
            goal=f"Verify and validate implementation for: {goal}",
            agent_type=AgentType.EXECUTOR,
            dependencies=[code_id],
        ))

        parallel_groups = [[research_id], [code_id], [test_id]]

        return MissionPlan(
            mission_id=mission_id,
            goal=goal,
            subtasks=subtasks,
            parallel_groups=parallel_groups,
        )

    async def _synthesize_results(
        self,
        mission_id: str,
        plan: MissionPlan,
        results: dict[str, TaskResult],
    ) -> str:
        completed = sum(1 for r in results.values() if r.success)
        total = len(results)
        return f"Mission completed: {completed}/{total} tasks succeeded. Goal: {plan.goal}"

    def get_mission(self, mission_id: str) -> Optional[dict]:
        return self._missions.get(mission_id)

    def list_missions(self) -> list[dict]:
        return list(self._missions.values())


agent_orchestrator = AgentOrchestrator()
