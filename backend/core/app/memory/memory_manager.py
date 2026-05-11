from __future__ import annotations

import logging
from typing import Optional

from app.memory.short_term import short_term_memory
from app.memory.long_term import long_term_memory
from app.memory.episodic import episodic_memory
from app.memory.embedding import embedding_pipeline
from app.memory.memory_ranker import memory_ranker
from app.memory.memory_decay import memory_decay

logger = logging.getLogger(__name__)


class MemoryManager:
    """Unified memory interface coordinating short-term, long-term, episodic memory."""

    def __init__(self):
        self.short_term = short_term_memory
        self.long_term = long_term_memory
        self.episodic = episodic_memory
        self.embedding = embedding_pipeline
        self.ranker = memory_ranker
        self.decay = memory_decay

    async def initialize(self) -> None:
        await self.long_term.initialize()
        logger.info("Memory manager initialized")

    async def retrieval_augmented_context(
        self,
        agent_id: str,
        query: str,
        limit: int = 10,
    ) -> list[dict]:
        # Get recent short-term context
        recent_messages = await self.short_term.get_recent_messages(agent_id, count=5)

        # Get recent episodic context
        episodes = await self.episodic.get_recent_episodes(agent_id, hours=24)

        # Semantic search in long-term memory
        query_embedding = await self.embedding.embed(query)
        vector_results = await self.long_term.search(
            query_embedding=query_embedding,
            limit=limit,
        )

        # Combine all sources
        all_items: list[dict] = []

        for msg in recent_messages:
            all_items.append({
                "content": msg.content,
                "score": 0.7,
                "importance": 0.5,
                "memory_type": "conversation",
                "source": "short_term",
            })

        for ep in episodes:
            all_items.append({
                "content": ep.get("content", ""),
                "score": 0.5,
                "importance": 0.4,
                "memory_type": "episodic",
                "source": "episodic",
            })

        all_items.extend([{**item, "source": "long_term"} for item in vector_results])

        # Update access counts
        for item in vector_results:
            mem_id = item.get("id")
            if mem_id:
                await self.long_term.increment_access(mem_id)

        # Rank and deduplicate
        ranked = self.ranker.rank(query, all_items, query_embedding)
        return ranked[:limit]

    async def store_and_embed(
        self,
        agent_id: str,
        content: str,
        memory_type: str = "episodic",
        importance: Optional[float] = None,
        tags: Optional[list[str]] = None,
        mission_id: Optional[str] = None,
    ) -> str:
        if importance is None:
            importance = self.ranker.score_importance(content, memory_type)

        embedding = await self.embedding.embed(content)

        memory_id = await self.long_term.store(
            content=content,
            embedding=embedding,
            memory_type=memory_type,
            importance=importance,
            tags=tags or [],
            agent_id=agent_id,
            mission_id=mission_id,
        )

        logger.debug(f"Stored + embedded memory: {memory_id} (importance: {importance:.2f})")
        return memory_id

    async def consolidate_agent_thoughts(
        self,
        agent_id: str,
        summarizer=None,
    ) -> None:
        thoughts = await self.episodic.get_agent_thoughts(agent_id, limit=100)

        for thought in thoughts:
            content = thought.get("content", "")
            if len(content) < 50:
                continue

            importance = self.ranker.score_importance(content, thought.get("thought_type", "episodic"))

            if importance > 0.4:
                await self.store_and_embed(
                    agent_id=agent_id,
                    content=content,
                    memory_type="episodic",
                    importance=importance,
                    tags=[thought.get("thought_type", "action"), thought.get("tool_name", "")],
                )

    async def search_memories(
        self,
        query: str,
        memory_type: Optional[str] = None,
        limit: int = 10,
    ) -> list[dict]:
        query_embedding = await self.embedding.embed(query)
        results = await self.long_term.search(
            query_embedding=query_embedding,
            memory_type=memory_type,
            limit=limit,
        )

        for item in results:
            mem_id = item.get("id")
            if mem_id:
                await self.long_term.increment_access(mem_id)

        return self.ranker.rank(query, results, query_embedding)

    async def run_decay_maintenance(self, agent_id: str) -> int:
        old_memories = await self.long_term.list_old_memories(days=30)
        archived_count = 0

        for mem in old_memories:
            importance = float(mem.get("importance", 0.3))
            access_count = int(mem.get("access_count", 0))
            created_str = str(mem.get("created_at", ""))
            try:
                from datetime import datetime
                created = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                age_days = (datetime.utcnow() - created.replace(tzinfo=None)).days
            except Exception:
                age_days = 30

            new_score = self.decay.calculate(
                importance=importance,
                age_days=age_days,
                access_count=access_count,
                memory_type=str(mem.get("memory_type", "episodic")),
            )

            mem_id = str(mem.get("id", ""))
            if mem_id:
                if self.decay.should_archive(new_score):
                    await self.long_term.delete(mem_id)
                    archived_count += 1
                else:
                    await self.long_term.update_importance(mem_id, new_score)

        logger.info(f"Memory decay: archived {archived_count} memories for agent {agent_id}")
        return archived_count


memory_manager = MemoryManager()
