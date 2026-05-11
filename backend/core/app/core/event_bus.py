from __future__ import annotations

import json
import asyncio
import logging
from typing import AsyncIterator, Optional, Any
from datetime import datetime

from app.db.redis import redis_client

logger = logging.getLogger(__name__)


class EventBus:
    """Real-time event system using Redis Pub/Sub."""

    async def publish(self, channel: str, event_type: str, data: dict[str, Any]) -> None:
        payload = json.dumps({
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        })
        try:
            await redis_client.publish(channel, payload)
        except Exception as e:
            logger.error(f"Failed to publish event to {channel}: {e}")

    async def agent_thought(self, agent_id: str, step: int, thought_type: str, content: str) -> None:
        await self.publish(
            f"events:agent:{agent_id}",
            "agent.thought",
            {"agent_id": agent_id, "step": step, "thought_type": thought_type, "content": content},
        )

    async def agent_state_changed(self, agent_id: str, old_state: str, new_state: str) -> None:
        await self.publish(
            f"events:agent:{agent_id}",
            "agent.state_changed",
            {"agent_id": agent_id, "old_state": old_state, "new_state": new_state},
        )

    async def tool_started(self, agent_id: str, tool_name: str, params: dict, execution_id: str) -> None:
        await self.publish(
            f"events:tool:{execution_id}",
            "agent.tool_started",
            {"agent_id": agent_id, "tool_name": tool_name, "input": params, "execution_id": execution_id},
        )

    async def tool_completed(self, agent_id: str, tool_name: str, result: str, execution_id: str, latency_ms: float) -> None:
        await self.publish(
            f"events:tool:{execution_id}",
            "agent.tool_completed",
            {"agent_id": agent_id, "tool_name": tool_name, "output": result, "execution_id": execution_id, "latency_ms": int(latency_ms)},
        )

    async def tool_failed(self, agent_id: str, tool_name: str, error: str, execution_id: str) -> None:
        await self.publish(
            f"events:tool:{execution_id}",
            "agent.tool_failed",
            {"agent_id": agent_id, "tool_name": tool_name, "error": error, "execution_id": execution_id},
        )

    async def task_completed(self, agent_id: str, task_id: str, summary: str) -> None:
        await self.publish(
            f"events:agent:{agent_id}",
            "agent.task_completed",
            {"agent_id": agent_id, "task_id": task_id, "summary": summary},
        )

    async def task_failed(self, agent_id: str, task_id: str, error: str) -> None:
        await self.publish(
            f"events:agent:{agent_id}",
            "agent.task_failed",
            {"agent_id": agent_id, "task_id": task_id, "error": error},
        )

    async def memory_stored(self, agent_id: str, memory_id: str) -> None:
        await self.publish(
            "events:memory:update",
            "memory.stored",
            {"agent_id": agent_id, "memory_id": memory_id},
        )

    async def system_metric(self, name: str, value: float, tags: dict = None) -> None:
        await self.publish(
            "events:system:metrics",
            "system.metric",
            {"name": name, "value": value, "tags": tags or {}},
        )

    async def subscribe(self, channel: str) -> AsyncIterator[dict[str, Any]]:
        try:
            pubsub = redis_client.pubsub()
            await pubsub.subscribe(channel)

            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        yield data
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            logger.error(f"Subscription error on {channel}: {e}")
        finally:
            try:
                await pubsub.unsubscribe(channel)
            except Exception:
                pass


event_bus = EventBus()
