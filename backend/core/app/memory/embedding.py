from __future__ import annotations

import hashlib
import logging
from typing import Optional

from app.models.base import BaseProvider
from app.models.provider_factory import ProviderFactory

logger = logging.getLogger(__name__)


class EmbeddingPipeline:
    """Generates embeddings using available providers with fallback."""

    def __init__(self):
        self._cache: dict[str, list[float]] = {}

    async def embed(self, text: str, provider_name: Optional[str] = None) -> list[float]:
        cache_key = hashlib.sha256(text.encode()).hexdigest()
        if cache_key in self._cache:
            return self._cache[cache_key]

        vector = await self._generate_embedding(text, provider_name)

        if len(self._cache) > 10000:
            self._cache.clear()
        self._cache[cache_key] = vector
        return vector

    async def _generate_embedding(self, text: str, provider_name: Optional[str] = None) -> list[float]:
        provider = None

        if provider_name:
            provider = ProviderFactory.get(provider_name)

        if not provider:
            import requests
            try:
                response = requests.post(
                    "http://localhost:11434/api/embeddings",
                    json={"model": "nomic-embed-text", "prompt": text[:8000]},
                    timeout=10,
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("embedding", [])
            except Exception:
                logger.debug("Ollama embedding not available")

        if not provider:
            provider = ProviderFactory.get("openai")

        if not provider:
            return self._fallback_embed(text)

        try:
            import openai
            client = openai.AsyncOpenAI(
                api_key=provider.api_key,
                base_url=getattr(provider, 'client', None) and str(getattr(provider.client, 'base_url', "https://api.openai.com/v1")) or "https://api.openai.com/v1",
            )
            response = await client.embeddings.create(
                model="text-embedding-3-small",
                input=text[:8000],
            )
            return response.data[0].embedding
        except Exception as e:
            logger.warning(f"Embedding failed: {e}")
            return self._fallback_embed(text)

    def _fallback_embed(self, text: str) -> list[float]:
        """Deterministic fallback embedding using hashing."""
        import struct
        words = text.lower().split()[:500]
        vector: list[float] = []
        for i in range(384):
            seed = hashlib.sha256(f"{i}:{text}".encode()).digest()
            val = struct.unpack('f', seed[:4])[0] / 1e10
            vector.append(min(max(val, -1.0), 1.0))
        return vector

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        results: list[list[float]] = []
        for text in texts:
            embedding = await self.embed(text)
            results.append(embedding)
        return results


embedding_pipeline = EmbeddingPipeline()
