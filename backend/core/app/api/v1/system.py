from fastapi import APIRouter
from prometheus_client import generate_latest
from fastapi.responses import Response

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "healthy", "uptime": "operational"}


@router.get("/status")
async def system_status():
    return {
        "status": "online",
        "active_agents": 0,
        "active_sessions": 0,
        "memory_usage_mb": 0,
        "model_requests_today": 0,
        "total_tokens_today": 0,
    }


@router.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type="text/plain")
