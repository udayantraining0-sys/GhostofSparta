from fastapi import APIRouter

from app.api.v1 import system, chat, agents, tools, models, memory, terminal, missions, workflows

api_router = APIRouter()

api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(tools.router, prefix="/tools", tags=["tools"])
api_router.include_router(models.router, prefix="/models", tags=["models"])
api_router.include_router(memory.router, prefix="/memory", tags=["memory"])
api_router.include_router(terminal.router, prefix="/terminal", tags=["terminal"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["workflows"])
api_router.include_router(missions.router, prefix="/missions", tags=["missions"])
