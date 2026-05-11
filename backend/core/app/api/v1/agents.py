import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal
from enum import Enum

router = APIRouter()


class AgentType(str, Enum):
    researcher = "researcher"
    coder = "coder"
    planner = "planner"
    executor = "executor"
    browser_agent = "browser_agent"
    memory_agent = "memory_agent"


class AgentStatus(str, Enum):
    idle = "idle"
    thinking = "thinking"
    executing = "executing"
    paused = "paused"
    stopped = "stopped"
    error = "error"


class CreateAgentRequest(BaseModel):
    type: AgentType
    name: str
    task: Optional[str] = None
    model: Optional[str] = None


class AgentResponse(BaseModel):
    id: str
    type: AgentType
    name: str
    status: AgentStatus
    current_task: Optional[str]
    model: str
    tool_count: int
    memory_usage: int
    started_at: Optional[str]


# In-memory agent store (replace with DB later)
_agents: dict[str, dict] = {}


@router.post("", response_model=AgentResponse)
async def create_agent(request: CreateAgentRequest):
    agent_id = str(uuid.uuid4())
    default_models = {
        "researcher": "o3-mini",
        "coder": "claude-sonnet-4-20250514",
        "planner": "o3-mini",
        "executor": "claude-sonnet-4-20250514",
        "browser_agent": "claude-sonnet-4-20250514",
        "memory_agent": "gpt-4.1-nano",
    }
    tool_counts = {
        "researcher": 4,
        "coder": 6,
        "planner": 3,
        "executor": 5,
        "browser_agent": 4,
        "memory_agent": 3,
    }

    agent = {
        "id": agent_id,
        "type": request.type,
        "name": request.name,
        "status": "idle",
        "current_task": request.task,
        "model": request.model or default_models.get(request.type, "claude-sonnet-4-20250514"),
        "tool_count": tool_counts.get(request.type, 4),
        "memory_usage": 0,
        "started_at": None,
    }
    _agents[agent_id] = agent
    return AgentResponse(**agent)


@router.get("", response_model=list[AgentResponse])
async def list_agents():
    return [AgentResponse(**a) for a in _agents.values()]


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str):
    agent = _agents.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentResponse(**agent)


@router.post("/{agent_id}/execute", response_model=AgentResponse)
async def execute_agent(agent_id: str):
    agent = _agents.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent["status"] = "executing"
    agent["started_at"] = "2024-01-01T00:00:00Z"
    return AgentResponse(**agent)


@router.post("/{agent_id}/pause", response_model=AgentResponse)
async def pause_agent(agent_id: str):
    agent = _agents.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent["status"] = "paused"
    return AgentResponse(**agent)


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    if agent_id not in _agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    del _agents[agent_id]
    return {"status": "deleted"}
