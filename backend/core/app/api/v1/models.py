from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

_providers: dict[str, dict] = {}
_routing_table: dict[str, dict] = {
    "coding": {"primary": {"provider": "anthropic", "model": "claude-sonnet-4-20250514"}, "fallback": ["gpt-4o", "deepseek-chat"]},
    "reasoning": {"primary": {"provider": "openai", "model": "o3-mini"}, "fallback": ["claude-sonnet-4-20250514"]},
    "planning": {"primary": {"provider": "openai", "model": "o3-mini"}, "fallback": ["claude-sonnet-4-20250514"]},
    "summarization": {"primary": {"provider": "groq", "model": "gpt-4.1-nano"}, "fallback": ["llama3.2:3b"]},
    "conversation": {"primary": {"provider": "anthropic", "model": "claude-sonnet-4-20250514"}, "fallback": ["gpt-4o"]},
    "embedding": {"primary": {"provider": "openai", "model": "text-embedding-3-large"}, "fallback": ["nomic-embed-text"]},
}


class ProviderConfig(BaseModel):
    name: str
    provider_type: str
    api_key: str
    base_url: Optional[str] = None
    enabled: bool = True


class RoutingRule(BaseModel):
    task_type: str
    primary_provider: str
    primary_model: str
    fallback_models: list[str] = []


class ModelStats(BaseModel):
    provider: str
    model: str
    total_tokens: int = 0
    total_cost: float = 0.0
    avg_latency_ms: float = 0.0
    request_count: int = 0


@router.get("")
async def list_providers():
    return list(_providers.values())


@router.post("/provider")
async def add_provider(config: ProviderConfig):
    _providers[config.name] = config.model_dump()
    return {"status": "added", "provider": config.name}


@router.patch("/provider/{name}")
async def update_provider(name: str, config: ProviderConfig):
    if name not in _providers:
        raise HTTPException(status_code=404, detail="Provider not found")
    _providers[name] = config.model_dump()
    return {"status": "updated"}


@router.delete("/provider/{name}")
async def remove_provider(name: str):
    if name not in _providers:
        raise HTTPException(status_code=404, detail="Provider not found")
    del _providers[name]
    return {"status": "removed"}


@router.get("/route")
async def get_routing_table():
    return _routing_table


@router.put("/route")
async def update_routing_table(routing: dict):
    _routing_table.update(routing)
    return {"status": "updated"}


@router.get("/stats")
async def get_model_stats():
    return {"message": "Model usage statistics not yet available", "providers": 0}
