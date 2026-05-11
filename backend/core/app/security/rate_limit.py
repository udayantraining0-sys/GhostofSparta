from __future__ import annotations

import logging
from typing import Optional
from datetime import datetime

from app.config import settings
from app.db.postgres import async_session
from app.db.models.base import AuditLog

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple in-memory rate limiter with Redis persistence."""

    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._counters: dict[str, list[float]] = {}

    async def is_allowed(self, key: str, cost: int = 1) -> bool:
        from app.db.redis import redis_client
        import time

        now = time.time()
        window_key = f"ratelimit:{key}"

        try:
            count = await redis_client.incrby(window_key, cost)
            if count == cost:
                await redis_client.expire(window_key, self.window_seconds)
            return count <= self.max_requests
        except Exception:
            # Fallback to in-memory
            if key not in self._counters:
                self._counters[key] = []
            self._counters[key] = [t for t in self._counters[key] if now - t < self.window_seconds]
            if len(self._counters[key]) >= self.max_requests:
                return False
            self._counters[key].append(now)
            return True


rate_limiter = RateLimiter(max_requests=100, window_seconds=60)


class AuditLogger:
    """Audit logging for all system operations."""

    async def log(
        self,
        action: str,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[dict] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        try:
            async with async_session() as session:
                log = AuditLog(
                    user_id=user_id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    ip_address=ip_address,
                    details=details or {},
                    created_at=datetime.utcnow(),
                )
                session.add(log)
                await session.commit()
        except Exception as e:
            logger.warning(f"Audit log failed: {e}")

    async def get_logs(
        self,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100,
    ) -> list[dict]:
        try:
            async with async_session() as session:
                from sqlalchemy import select
                query = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
                if user_id:
                    query = query.where(AuditLog.user_id == user_id)
                if action:
                    query = query.where(AuditLog.action == action)

                result = await session.execute(query)
                logs = result.scalars().all()
                return [
                    {
                        "id": str(l.id),
                        "user_id": str(l.user_id) if l.user_id else None,
                        "action": l.action,
                        "resource_type": l.resource_type,
                        "resource_id": str(l.resource_id) if l.resource_id else None,
                        "ip_address": l.ip_address,
                        "details": l.details,
                        "created_at": str(l.created_at),
                    }
                    for l in logs
                ]
        except Exception:
            return []


audit_logger = AuditLogger()
