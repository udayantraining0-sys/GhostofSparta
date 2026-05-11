from __future__ import annotations

import json
import asyncio
import logging
from typing import Optional, Callable, Awaitable, Any
from datetime import datetime

from app.db.redis import redis_client
from app.core.types import Message

logger = logging.getLogger(__name__)


class ShortTermMemory:
    """Redis-based short-term memory for active session context."""

    def __init__(self):
        self.default_ttl = 24 * 60 * 60  # 24 hours

    async def store_message(self, session_id: str, message: Message) -> None:
        key = f"session:{session_id}:messages"
        data = json.dumps({
            "role": message.role,
            "content": message.content,
            "timestamp": datetime.utcnow().isoformat(),
        })
        await redis_client.rpush(key, data)
        await redis_client.expire(key, self.default_ttl)

    async def get_recent_messages(self, session_id: str, count: int = 20) -> list[Message]:
        key = f"session:{session_id}:messages"
        raw = await redis_client.lrange(key, -count, -1)
        messages: list[Message] = []
        for item in raw:
            try:
                data = json.loads(item)
                messages.append(Message(role=data["role"], content=data["content"]))
            except Exception:
                continue
        return messages

    async def set_context(self, session_id: str, key: str, value: Any) -> None:
        ctx_key = f"session:{session_id}:context"
        await redis_client.hset(ctx_key, key, json.dumps(value) if not isinstance(value, str) else value)
        await redis_client.expire(ctx_key, self.default_ttl)

    async def get_context(self, session_id: str) -> dict[str, Any]:
        ctx_key = f"session:{session_id}:context"
        raw = await redis_client.hgetall(ctx_key)
        result: dict[str, Any] = {}
        for k, v in raw.items():
            try:
                result[k] = json.loads(v)
            except (json.JSONDecodeError, TypeError):
                result[k] = v
        return result

    async def store_tool_result(self, session_id: str, tool_name: str, result: str) -> None:
        key = f"session:{session_id}:tool_results"
        data = json.dumps({
            "tool": tool_name,
            "result": result[:2000],
            "timestamp": datetime.utcnow().isoformat(),
        })
        await redis_client.rpush(key, data)
        await redis_client.ltrim(key, -20, -1)
        await redis_client.expire(key, self.default_ttl)

    async def get_tool_results(self, session_id: str, count: int = 5) -> list[dict]:
        key = f"session:{session_id}:tool_results"
        raw = await redis_client.lrange(key, -count, -1)
        return [json.loads(item) for item in raw if item]

    async def cache_response(self, hash_key: str, response: str, ttl: int = 3600) -> None:
        key = f"cache:llm:{hash_key}"
        await redis_client.setex(key, ttl, response)

    async def get_cached_response(self, hash_key: str) -> Optional[str]:
        key = f"cache:llm:{hash_key}"
        return await redis_client.get(key)

    async def clear_session(self, session_id: str) -> None:
        keys = [
            f"session:{session_id}:messages",
            f"session:{session_id}:context",
            f"session:{session_id}:tool_results",
        ]
        for key in keys:
            await redis_client.delete(key)


short_term_memory = ShortTermMemory()
