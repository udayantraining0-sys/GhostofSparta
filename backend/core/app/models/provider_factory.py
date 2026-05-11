from __future__ import annotations

import logging
from typing import Optional

from app.models.base import BaseProvider
from app.models.openai import OpenAIProvider
from app.models.anthropic import AnthropicProvider
from app.models.openrouter import OpenRouterProvider
from app.models.groq import GroqProvider
from app.models.ollama import OllamaProvider

logger = logging.getLogger(__name__)


class ProviderFactory:
    _providers: dict[str, BaseProvider] = {}
    _provider_classes = {
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
        "openrouter": OpenRouterProvider,
        "groq": GroqProvider,
        "ollama": OllamaProvider,
    }

    @classmethod
    def register(
        cls,
        name: str,
        provider_type: str,
        api_key: str,
        base_url: Optional[str] = None,
    ) -> BaseProvider:
        provider_cls = cls._provider_classes.get(provider_type)
        if not provider_cls:
            raise ValueError(f"Unknown provider type: {provider_type}. Available: {list(cls._provider_classes.keys())}")

        kwargs = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url

        provider = provider_cls(**kwargs)
        cls._providers[name] = provider
        logger.info(f"Registered provider: {name} ({provider_type})")
        return provider

    @classmethod
    def get(cls, name: str) -> Optional[BaseProvider]:
        return cls._providers.get(name)

    @classmethod
    def list_names(cls) -> list[str]:
        return list(cls._providers.keys())

    @classmethod
    def list_providers(cls) -> dict[str, dict]:
        return {
            name: {
                "provider_name": p.provider_name,
                "available": False,
            }
            for name, p in cls._providers.items()
        }

    @classmethod
    def unregister(cls, name: str):
        if name in cls._providers:
            del cls._providers[name]
            logger.info(f"Unregistered provider: {name}")
