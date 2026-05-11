from __future__ import annotations

import hashlib
from datetime import datetime, timedelta


class MemoryRanker:
    """Scores and ranks memories by relevance and importance."""

    @staticmethod
    def score_importance(content: str, memory_type: str = "episodic") -> float:
        factors: dict[str, float] = {
            "episodic": 0.4,
            "semantic": 0.6,
            "conversation": 0.3,
            "procedural": 0.5,
        }

        base = factors.get(memory_type, 0.3)

        indicators = [
            "important", "critical", "key", "vital", "essential",
            "remember", "note", "warning", "error", "lesson",
            "discovered", "learned", "achieved", "milestone",
        ]

        score = base
        lower = content.lower()
        matches = sum(1 for word in indicators if word in lower)
        score += matches * 0.08

        # Longer content may be more substantive
        if len(content) > 500:
            score += 0.1
        if len(content) > 2000:
            score += 0.05

        return min(score, 1.0)

    @staticmethod
    def rank(query: str, items: list[dict], query_embedding: list[float] = None) -> list[dict]:
        ranked = []
        query_lower = query.lower()
        query_words = set(query_lower.split())

        for item in items:
            content = item.get("content", "")
            content_lower = content.lower()
            content_words = set(content_lower.split())

            word_overlap = len(query_words & content_words) / max(len(query_words), 1)

            score = (
                item.get("score", 0.5) * 0.6 +
                item.get("importance", 0.3) * 0.25 +
                word_overlap * 0.15
            )

            ranked.append({**item, "ranked_score": score})

        return sorted(ranked, key=lambda x: x["ranked_score"], reverse=True)


memory_ranker = MemoryRanker()
