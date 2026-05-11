from __future__ import annotations

import uuid
import logging
from typing import Optional
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class NodeType(str, Enum):
    CHAT = "chat"
    AGENT = "agent"
    TOOL = "tool"
    CONDITION = "condition"
    MEMORY = "memory"
    WAIT = "wait"
    BRANCH = "branch"
    MERGE = "merge"
    START = "start"
    END = "end"


class NodeStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class WorkflowNode:
    id: str
    type: NodeType
    label: str
    config: dict = field(default_factory=dict)
    position: dict = field(default_factory=dict)
    status: NodeStatus = NodeStatus.PENDING
    result: Optional[dict] = None


@dataclass
class WorkflowEdge:
    id: str
    source: str
    target: str
    source_handle: str = "default"
    target_handle: str = "default"
    label: str = ""
    condition: Optional[str] = None


@dataclass
class Workflow:
    id: str
    name: str
    description: str = ""
    nodes: list[WorkflowNode] = field(default_factory=list)
    edges: list[WorkflowEdge] = field(default_factory=list)
    status: str = "draft"
    created_at: str = ""
    updated_at: str = ""


class WorkflowEngine:
    def __init__(self):
        self._workflows: dict[str, Workflow] = {}
        self._running: dict[str, bool] = {}

    def create_workflow(self, name: str, description: str = "") -> Workflow:
        wf = Workflow(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            nodes=[],
            edges=[],
            created_at="now",
        )

        start_node = WorkflowNode(
            id=str(uuid.uuid4()),
            type=NodeType.START,
            label="Start",
            position={"x": 100, "y": 200},
        )
        end_node = WorkflowNode(
            id=str(uuid.uuid4()),
            type=NodeType.END,
            label="End",
            position={"x": 700, "y": 200},
        )
        wf.nodes = [start_node, end_node]
        wf.edges = [WorkflowEdge(
            id=str(uuid.uuid4()),
            source=start_node.id,
            target=end_node.id,
        )]

        self._workflows[wf.id] = wf
        return wf

    async def execute_workflow(self, workflow_id: str, context: dict = None) -> dict:
        workflow = self._workflows.get(workflow_id)
        if not workflow:
            return {"error": "Workflow not found"}

        workflow.status = "running"
        self._running[workflow_id] = True

        node_map = {n.id: n for n in workflow.nodes}
        results: dict[str, dict] = {}

        start_node = next((n for n in workflow.nodes if n.type == NodeType.START), None)
        if not start_node:
            return {"error": "No start node"}

        current_nodes = self._get_next_nodes(start_node.id, workflow.edges, node_map)

        while current_nodes and self._running.get(workflow_id):
            for node in current_nodes:
                node.status = NodeStatus.RUNNING

                try:
                    result = await self._execute_node(node, context or {}, results)
                    results[node.id] = result or {}
                    node.status = NodeStatus.COMPLETED
                    node.result = result
                except Exception as e:
                    logger.error(f"Node {node.id} ({node.type}) failed: {e}")
                    node.status = NodeStatus.FAILED
                    node.result = {"error": str(e)}

            current_nodes = self._get_next_nodes(
                [n.id for n in current_nodes], workflow.edges, node_map
            )

        workflow.status = "completed"
        return {"workflow_id": workflow_id, "status": "completed", "results": results}

    async def _execute_node(self, node: WorkflowNode, context: dict, results: dict) -> dict:
        handler = {
            NodeType.CHAT: self._execute_chat,
            NodeType.AGENT: self._execute_agent,
            NodeType.TOOL: self._execute_tool,
            NodeType.MEMORY: self._execute_memory,
            NodeType.WAIT: self._execute_wait,
            NodeType.START: self._execute_start,
            NodeType.END: self._execute_end,
        }.get(node.type, self._execute_start)

        return await handler(node, context, results)

    async def _execute_start(self, node: WorkflowNode, ctx: dict, res: dict) -> dict:
        return {"message": "Workflow started"}

    async def _execute_end(self, node: WorkflowNode, ctx: dict, res: dict) -> dict:
        return {"message": "Workflow completed"}

    async def _execute_chat(self, node: WorkflowNode, ctx: dict, res: dict) -> dict:
        message = node.config.get("message", "")
        return {"response": f"Chat node executed: {message}"}

    async def _execute_agent(self, node: WorkflowNode, ctx: dict, res: dict) -> dict:
        agent_type = node.config.get("agent_type", "executor")
        task = node.config.get("task", "")
        return {"agent": agent_type, "task": task, "summary": "Agent task queued"}

    async def _execute_tool(self, node: WorkflowNode, ctx: dict, res: dict) -> dict:
        tool_name = node.config.get("tool", "")
        return {"tool": tool_name, "result": "Tool executed"}

    async def _execute_memory(self, node: WorkflowNode, ctx: dict, res: dict) -> dict:
        operation = node.config.get("operation", "search")
        query = node.config.get("query", "")
        return {"operation": operation, "query": query}

    async def _execute_wait(self, node: WorkflowNode, ctx: dict, res: dict) -> dict:
        seconds = float(node.config.get("seconds", 1))
        import asyncio
        await asyncio.sleep(min(seconds, 30))
        return {"waited_seconds": seconds}

    def _get_next_nodes(
        self, node_ids: list[str], edges: list[WorkflowEdge], node_map: dict
    ) -> list[WorkflowNode]:
        next_ids: set[str] = set()
        for edge in edges:
            if edge.source in node_ids:
                next_ids.add(edge.target)

        return [node_map[nid] for nid in next_ids if nid in node_map and node_map[nid].status == NodeStatus.PENDING]

    def get_workflow(self, workflow_id: str) -> Optional[Workflow]:
        return self._workflows.get(workflow_id)

    def list_workflows(self) -> list[Workflow]:
        return list(self._workflows.values())

    def cancel_workflow(self, workflow_id: str) -> None:
        self._running[workflow_id] = False
        wf = self._workflows.get(workflow_id)
        if wf:
            wf.status = "cancelled"


workflow_engine = WorkflowEngine()
