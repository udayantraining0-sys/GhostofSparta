from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import asyncio
import json

router = APIRouter()

_active_sessions: dict[str, dict] = {}


class CreateSessionRequest(BaseModel):
    cols: int = 120
    rows: int = 40
    cwd: str = "/workspace"


@router.post("/session")
async def create_terminal_session(request: CreateSessionRequest):
    import uuid
    session_id = str(uuid.uuid4())
    _active_sessions[session_id] = {
        "id": session_id,
        "cols": request.cols,
        "rows": request.rows,
        "cwd": request.cwd,
        "history": [],
    }
    return {"session_id": session_id, "cols": request.cols, "rows": request.rows}


@router.delete("/session/{session_id}")
async def close_terminal_session(session_id: str):
    if session_id in _active_sessions:
        del _active_sessions[session_id]
    return {"status": "closed"}


@router.websocket("/ws/{session_id}")
async def terminal_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    await websocket.send_text(json.dumps({"type": "connected", "session_id": session_id}))

    try:
        while True:
            data = await websocket.receive_text()
            # Simulated command execution
            response = f"$ {data}\nSimulated output for: {data}\n"
            await websocket.send_text(json.dumps({"type": "output", "data": response}))
    except WebSocketDisconnect:
        if session_id in _active_sessions:
            del _active_sessions[session_id]
