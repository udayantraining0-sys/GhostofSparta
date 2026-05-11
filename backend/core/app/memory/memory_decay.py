from __future__ import annotations

from datetime import datetime


class MemoryDecay:
    """Implements Ebbinghaus-style forgetting curves for memory importance."""

    @staticmethod
    def calculate(
        importance: float,
        age_days: float,
        access_count: int,
        memory_type: str = "episodic",
    ) -> float:
        decay_rates = {
            "episodic": 0.03,
            "semantic": 0.005,
            "conversation": 0.05,
            "procedural": 0.01,
        }

        rate = decay_rates.get(memory_type, 0.03)

        natural_decay = importance * (1.0 - rate * min(age_days, 365))

        access_recovery = min(access_count * 0.02, 0.3)

        score = natural_decay + access_recovery

        return max(0.0, min(1.0, score))

    @staticmethod
    def should_archive(score: float, threshold: float = 0.08) -> bool:
        return score < threshold

    @staticmethod
    def should_consolidate(
        importance: float,
        access_count: int,
        age_days: float,
    ) -> bool:
        return importance > 0.65 and access_count > 3 and age_days > 7


memory_decay = MemoryDecay()
