import uuid
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal
from enum import Enum

from app.memory.memory_manager import memory_manager
from app.memory.long_term import long_term_memory
from app.memory.episodic import episodic_memory

router = APIRouter()
logger = logging.getLogger(__name__)


class MemoryType(str, Enum):
    episodic = "episodic"
    semantic = "semantic"
    conversation = "conversation"
    procedural = "procedural"


class StoreMemoryRequest(BaseModel):
    content: str
    memory_type: MemoryType = MemoryType.conversation
    importance: Optional[float] = None
    tags: list[str] = []


class SearchMemoryRequest(BaseModel):
    query: str
    memory_type: Optional[MemoryType] = None
    limit: int = 10


class MemoryItem(BaseModel):
    id: str = ""
    content: str
    memory_type: str
    importance: float
    tags: list[str] = []
    score: float = 0.0
    created_at: str = ""
    source: str = ""


@router.post("/search")
async def search_memory(request: SearchMemoryRequest):
    try:
        results = await memory_manager.search_memories(
            query=request.query,
            memory_type=request.memory_type,
            limit=request.limit,
        )
        return {
            "query": request.query,
            "results": results,
            "total_results": len(results),
        }
    except Exception as e:
        logger.error(f"Memory search failed: {e}")
        return {"query": request.query, "results": [], "total_results": 0, "error": str(e)}


@router.post("/store")
async def store_memory(request: StoreMemoryRequest):
    try:
        memory_id = await memory_manager.store_and_embed(
            agent_id="user",
            content=request.content,
            memory_type=request.memory_type,
            importance=request.importance,
            tags=request.tags,
        )
        return {"id": memory_id, "status": "stored"}
    except Exception as e:
        logger.error(f"Memory store failed: {e}")
        return {"id": "", "status": "error", "error": str(e)}


@router.get("")
async def list_memories(memory_type: Optional[MemoryType] = None, limit: int = 50):
    try:
        if memory_type:
            results = await long_term_memory.list_by_type(memory_type, limit=limit)
        else:
            results = []
            for mt in MemoryType:
                results.extend(await long_term_memory.list_by_type(mt, limit=limit // 4 + 1))
        return results[:limit]
    except Exception as e:
        logger.error(f"Memory list failed: {e}")
        return []


@router.delete("/{memory_id}")
async def delete_memory(memory_id: str):
    try:
        success = await long_term_memory.delete(memory_id)
        return {"status": "deleted" if success else "not_found"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.post("/maintenance")
async def run_memory_maintenance(agent_id: str = "default"):
    try:
        count = await memory_manager.run_decay_maintenance(agent_id)
        return {"status": "completed", "archived_count": count}
    except Exception as e:
        return {"status": "error", "error": str(e)}
