from __future__ import annotations

import logging
from typing import Optional
from datetime import datetime, timedelta

from app.db.postgres import async_session
from app.db.models.base import AgentThought, AuditLog

logger = logging.getLogger(__name__)


class EpisodicMemory:
    """Stores and retrieves agent thought episodes from PostgreSQL."""

    async def store_thought(
        self,
        agent_id: str,
        step: int,
        thought_type: str,
        content: str,
        tool_name: Optional[str] = None,
        tool_input: Optional[dict] = None,
        tool_output: Optional[dict] = None,
        model_used: Optional[str] = None,
        tokens_used: Optional[int] = None,
    ) -> str:
        import uuid as _uuid
        thought_id = str(_uuid.uuid4())

        try:
            async with async_session() as session:
                thought = AgentThought(
                    id=thought_id,
                    agent_id=agent_id,
                    step_number=step,
                    thought_type=thought_type,
                    content=content,
                    tool_name=tool_name,
                    tool_input=tool_input,
                    tool_output=tool_output,
                    model_used=model_used,
                    tokens_used=tokens_used,
                    created_at=datetime.utcnow(),
                )
                session.add(thought)
                await session.commit()
                return thought_id
        except Exception as e:
            logger.warning(f"Episodic memory store failed (DB may not be up): {e}")
            return thought_id

    async def get_agent_thoughts(
        self,
        agent_id: str,
        limit: int = 50,
    ) -> list[dict]:
        try:
            async with async_session() as session:
                from sqlalchemy import select
                result = await session.execute(
                    select(AgentThought)
                    .where(AgentThought.agent_id == agent_id)
                    .order_by(AgentThought.step_number.desc())
                    .limit(limit)
                )
                thoughts = result.scalars().all()
                return [
                    {
                        "id": str(t.id),
                        "step": t.step_number,
                        "thought_type": t.thought_type,
                        "content": t.content,
                        "tool_name": t.tool_name,
                        "tool_input": t.tool_input,
                        "tool_output": t.tool_output,
                        "model_used": t.model_used,
                        "created_at": str(t.created_at) if t.created_at else None,
                    }
                    for t in thoughts
                ]
        except Exception:
            return []

    async def get_recent_episodes(
        self,
        agent_id: str,
        hours: int = 24,
    ) -> list[dict]:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        try:
            async with async_session() as session:
                from sqlalchemy import select
                result = await session.execute(
                    select(AgentThought)
                    .where(
                        AgentThought.agent_id == agent_id,
                        AgentThought.created_at >= cutoff,
                    )
                    .order_by(AgentThought.step_number.asc())
                )
                thoughts = result.scalars().all()
                return [
                    {
                        "id": str(t.id),
                        "step": t.step_number,
                        "thought_type": t.thought_type,
                        "content": t.content,
                    }
                    for t in thoughts
                ]
        except Exception:
            return []

    async def store_audit_log(
        self,
        user_id: Optional[str],
        action: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[dict] = None,
    ) -> None:
        try:
            async with async_session() as session:
                log = AuditLog(
                    user_id=user_id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    details=details or {},
                    created_at=datetime.utcnow(),
                )
                session.add(log)
                await session.commit()
        except Exception as e:
            logger.warning(f"Audit log store failed: {e}")


episodic_memory = EpisodicMemory()
