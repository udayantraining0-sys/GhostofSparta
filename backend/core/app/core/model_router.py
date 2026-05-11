from __future__ import annotations

import logging
from typing import Optional, AsyncIterator
from dataclasses import dataclass

from app.core.types import ModelProvider

logger = logging.getLogger(__name__)


class ModelRouter:
    """Intelligent model routing with fallback chains and cost/latency optimization."""

    ROUTING_TABLE = {
        "coding": {
            "primary": ("anthropic", "claude-sonnet-4-20250514"),
            "fallback": [("openai", "gpt-4o"), ("deepseek", "deepseek-chat")],
        },
        "reasoning": {
            "primary": ("openai", "o3-mini"),
            "fallback": [("anthropic", "claude-sonnet-4-20250514")],
        },
        "planning": {
            "primary": ("openai", "o3-mini"),
            "fallback": [("anthropic", "claude-sonnet-4-20250514")],
        },
        "summarization": {
            "primary": ("groq", "gpt-4.1-nano"),
            "fallback": [("ollama", "llama3.2:3b")],
        },
        "conversation": {
            "primary": ("anthropic", "claude-sonnet-4-20250514"),
            "fallback": [("openai", "gpt-4o")],
        },
        "embedding": {
            "primary": ("openai", "text-embedding-3-large"),
            "fallback": [("ollama", "nomic-embed-text")],
        },
    }

    def __init__(self):
        self._providers: dict[str, ModelProvider] = {}
        self._stats: dict[str, int] = {}  # tracking

    def register_provider(self, name: str, provider: ModelProvider):
        self._providers[name] = provider

    def get_route(self, task_type: str) -> Optional[list[tuple[str, str]]]:
        route = self.ROUTING_TABLE.get(task_type, self.ROUTING_TABLE["conversation"])
        routes = [route["primary"]]
        routes.extend(route.get("fallback", []))
        return routes

    async def route_completion(
        self,
        task_type: str,
        messages: list[dict],
        tools: Optional[list[dict]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> dict:
        routes = self.get_route(task_type)
        last_error = None

        for provider_name, model_name in routes:
            provider = self._providers.get(provider_name)
            if not provider:
                logger.warning(f"Provider not registered: {provider_name}")
                continue

            try:
                result = await provider.chat_completion(
                    messages=messages,
                    model=model_name,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                self._stats[f"{provider_name}:{model_name}"] = (
                    self._stats.get(f"{provider_name}:{model_name}", 0) + 1
                )
                return result
            except Exception as e:
                logger.warning(f"Route {provider_name}/{model_name} failed: {e}")
                last_error = e
                continue

        raise RuntimeError(f"All providers failed for task '{task_type}'. Last error: {last_error}")

    def get_stats(self) -> dict:
        return self._stats


model_router = ModelRouter()
