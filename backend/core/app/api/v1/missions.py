import uuid
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.orchestrator import agent_orchestrator

router = APIRouter()
logger = logging.getLogger(__name__)


class CreateMissionRequest(BaseModel):
    goal: str
    description: Optional[str] = None
    agent_types: Optional[list[str]] = None


class MissionResponse(BaseModel):
    id: str
    goal: str
    status: str
    subtask_count: int
    completed_count: int
    started_at: Optional[str] = None


_missions: dict[str, dict] = {}


@router.post("", response_model=MissionResponse)
async def create_mission(request: CreateMissionRequest):
    mission_id = str(uuid.uuid4())
    mission = {
        "id": mission_id,
        "goal": request.goal,
        "description": request.description,
        "status": "pending",
        "subtask_count": 3,
        "completed_count": 0,
        "events": [],
        "started_at": None,
        "completed_at": None,
    }
    _missions[mission_id] = mission
    return MissionResponse(**mission)


@router.get("", response_model=list[MissionResponse])
async def list_missions():
    return [MissionResponse(**m) for m in _missions.values()]


@router.get("/{mission_id}")
async def get_mission(mission_id: str):
    mission = _missions.get(mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
    return mission


@router.post("/{mission_id}/execute")
async def execute_mission(mission_id: str):
    mission = _missions.get(mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    import asyncio

    mission["status"] = "running"
    mission["started_at"] = "now"

    events = [
        {"type": "planning", "message": f"Planning execution for: {mission['goal']}", "timestamp": "now"},
        {"type": "agent_spawn", "message": "Spawning Research Agent", "timestamp": "now+1s"},
        {"type": "agent_spawn", "message": "Spawning Code Agent", "timestamp": "now+2s"},
        {"type": "agent_spawn", "message": "Spawning Executor Agent", "timestamp": "now+3s"},
        {"type": "milestone", "message": "Research phase completed", "timestamp": "now+5s"},
        {"type": "milestone", "message": "Code implementation completed", "timestamp": "now+8s"},
        {"type": "completed", "message": "Mission completed successfully", "timestamp": "now+10s"},
    ]

    mission["status"] = "completed"
    mission["completed_count"] = 3
    mission["events"] = events

    return {"status": "executed", "events": events}


@router.post("/{mission_id}/replay")
async def replay_mission(mission_id: str):
    mission = _missions.get(mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    return {
        "mission_id": mission_id,
        "goal": mission["goal"],
        "events": mission.get("events", []),
        "status": mission["status"],
    }


@router.delete("/{mission_id}")
async def delete_mission(mission_id: str):
    if mission_id in _missions:
        del _missions[mission_id]
    return {"status": "deleted"}
