import uuid
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any

from app.core.workflow_engine import workflow_engine, Workflow, WorkflowNode, WorkflowEdge, NodeType

router = APIRouter()
logger = logging.getLogger(__name__)


class CreateWorkflowRequest(BaseModel):
    name: str
    description: str = ""


class AddNodeRequest(BaseModel):
    type: NodeType
    label: str
    position: dict = {"x": 0, "y": 0}
    config: dict = {}


class AddEdgeRequest(BaseModel):
    source: str
    target: str
    source_handle: str = "default"
    target_handle: str = "default"
    label: str = ""


class ExecuteWorkflowRequest(BaseModel):
    context: dict = {}


@router.post("")
async def create_workflow(request: CreateWorkflowRequest):
    wf = workflow_engine.create_workflow(request.name, request.description)
    return {
        "id": wf.id,
        "name": wf.name,
        "description": wf.description,
        "nodes": wf.nodes,
        "edges": wf.edges,
    }


@router.get("")
async def list_workflows():
    return [
        {
            "id": wf.id,
            "name": wf.name,
            "description": wf.description,
            "status": wf.status,
            "node_count": len(wf.nodes),
        }
        for wf in workflow_engine.list_workflows()
    ]


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    wf = workflow_engine.get_workflow(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {
        "id": wf.id,
        "name": wf.name,
        "description": wf.description,
        "nodes": [{"id": n.id, "type": n.type, "label": n.label, "position": n.position, "config": n.config} for n in wf.nodes],
        "edges": [{"id": e.id, "source": e.source, "target": e.target, "sourceHandle": e.source_handle, "targetHandle": e.target_handle, "label": e.label} for e in wf.edges],
    }


@router.post("/{workflow_id}/nodes")
async def add_node(workflow_id: str, request: AddNodeRequest):
    wf = workflow_engine.get_workflow(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    node = WorkflowNode(
        id=str(uuid.uuid4()),
        type=request.type,
        label=request.label,
        position=request.position,
        config=request.config,
    )
    wf.nodes.append(node)
    return {"id": node.id, "type": node.type, "label": node.label, "position": node.position}


@router.post("/{workflow_id}/edges")
async def add_edge(workflow_id: str, request: AddEdgeRequest):
    wf = workflow_engine.get_workflow(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    edge = WorkflowEdge(
        id=str(uuid.uuid4()),
        source=request.source,
        target=request.target,
        source_handle=request.source_handle,
        target_handle=request.target_handle,
        label=request.label,
    )
    wf.edges.append(edge)
    return {"id": edge.id, "source": edge.source, "target": edge.target}


@router.post("/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, request: ExecuteWorkflowRequest = None):
    result = await workflow_engine.execute_workflow(workflow_id, (request or ExecuteWorkflowRequest()).context)
    return result


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    wf = workflow_engine.get_workflow(workflow_id)
    if wf:
        workflow_engine.cancel_workflow(workflow_id)
    return {"status": "deleted"}
