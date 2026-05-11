from __future__ import annotations

import uuid
import logging
from typing import Optional, Any
from datetime import datetime

import weaviate
import weaviate.classes as wvc

from app.config import settings

logger = logging.getLogger(__name__)

COLLECTION_MEMORY = "Memory"
COLLECTION_DOCUMENT = "Document"
COLLECTION_KNOWLEDGE = "KnowledgeNode"

_weaviate_client: Optional[weaviate.WeaviateClient] = None


async def get_weaviate_client() -> weaviate.WeaviateClient:
    global _weaviate_client
    if _weaviate_client is None:
        _weaviate_client = weaviate.connect_to_local(host="localhost", port=8080, grpc_port=50051)
    return _weaviate_client


class LongTermMemory:
    def __init__(self):
        self._initialized = False

    async def initialize(self) -> None:
        if self._initialized:
            return
        client = await get_weaviate_client()

        try:
            if not client.collections.exists(COLLECTION_MEMORY):
                client.collections.create(
                    name=COLLECTION_MEMORY,
                    vectorizer_config=wvc.config.Configure.Vectorizer.none(),
                    properties=[
                        wvc.config.Property(name="content", data_type=wvc.config.DataType.TEXT),
                        wvc.config.Property(name="memory_type", data_type=wvc.config.DataType.TEXT),
                        wvc.config.Property(name="importance", data_type=wvc.config.DataType.NUMBER),
                        wvc.config.Property(name="tags", data_type=wvc.config.DataType.TEXT_ARRAY),
                        wvc.config.Property(name="source_agent_id", data_type=wvc.config.DataType.TEXT),
                        wvc.config.Property(name="source_mission_id", data_type=wvc.config.DataType.TEXT),
                        wvc.config.Property(name="session_id", data_type=wvc.config.DataType.TEXT),
                        wvc.config.Property(name="access_count", data_type=wvc.config.DataType.INT),
                        wvc.config.Property(name="created_at", data_type=wvc.config.DataType.DATE),
                    ],
                )
                logger.info(f"Created Weaviate collection: {COLLECTION_MEMORY}")

            if not client.collections.exists(COLLECTION_DOCUMENT):
                client.collections.create(
                    name=COLLECTION_DOCUMENT,
                    vectorizer_config=wvc.config.Configure.Vectorizer.none(),
                    properties=[
                        wvc.config.Property(name="title", data_type=wvc.config.DataType.TEXT),
                        wvc.config.Property(name="content", data_type=wvc.config.DataType.TEXT),
                        wvc.config.Property(name="chunk_index", data_type=wvc.config.DataType.INT),
                        wvc.config.Property(name="file_type", data_type=wvc.config.DataType.TEXT),
                        wvc.config.Property(name="workspace_id", data_type=wvc.config.DataType.TEXT),
                    ],
                )
                logger.info(f"Created Weaviate collection: {COLLECTION_DOCUMENT}")

            self._initialized = True
        except Exception as e:
            logger.error(f"Failed to initialize Weaviate collections: {e}")

    async def store(
        self,
        content: str,
        embedding: list[float],
        memory_type: str = "episodic",
        importance: float = 0.5,
        tags: Optional[list[str]] = None,
        agent_id: Optional[str] = None,
        mission_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> str:
        client = await get_weaviate_client()
        collection = client.collections.get(COLLECTION_MEMORY)

        memory_id = str(uuid.uuid4())
        collection.data.insert(
            properties={
                "content": content[:8000],
                "memory_type": memory_type,
                "importance": importance,
                "tags": tags or [],
                "source_agent_id": agent_id or "",
                "source_mission_id": mission_id or "",
                "session_id": session_id or "",
                "access_count": 0,
                "created_at": datetime.utcnow().isoformat(),
            },
            uuid=memory_id,
            vector=embedding,
        )
        logger.debug(f"Stored memory: {memory_id}")
        return memory_id

    async def search(
        self,
        query_embedding: list[float],
        memory_type: Optional[str] = None,
        limit: int = 10,
        min_importance: float = 0.0,
    ) -> list[dict]:
        client = await get_weaviate_client()
        collection = client.collections.get(COLLECTION_MEMORY)

        filters = None
        if memory_type:
            filters = wvc.query.Filter.by_property("memory_type").equal(memory_type)
        if min_importance > 0:
            imp_filter = wvc.query.Filter.by_property("importance").greater_or_equal(min_importance)
            filters = filters & imp_filter if filters else imp_filter

        results = collection.query.near_vector(
            near_vector=query_embedding,
            limit=limit,
            filters=filters,
            return_metadata=wvc.query.MetadataQuery(distance=True),
        )

        items: list[dict] = []
        for obj in results.objects:
            props = dict(obj.properties)
            props["id"] = str(obj.uuid)
            props["score"] = 1.0 - (obj.metadata.distance or 0)
            items.append(props)

        return sorted(items, key=lambda x: x.get("score", 0), reverse=True)

    async def get(self, memory_id: str) -> Optional[dict]:
        client = await get_weaviate_client()
        collection = client.collections.get(COLLECTION_MEMORY)

        try:
            obj = collection.query.fetch_object_by_id(uuid=memory_id)
            if obj:
                props = dict(obj.properties)
                props["id"] = str(obj.uuid)
                return props
        except Exception:
            pass
        return None

    async def delete(self, memory_id: str) -> bool:
        client = await get_weaviate_client()
        collection = client.collections.get(COLLECTION_MEMORY)

        try:
            collection.data.delete_by_id(uuid=memory_id)
            return True
        except Exception:
            return False

    async def update_importance(self, memory_id: str, importance: float) -> None:
        client = await get_weaviate_client()
        collection = client.collections.get(COLLECTION_MEMORY)

        try:
            collection.data.update(
                uuid=memory_id,
                properties={"importance": importance},
            )
        except Exception as e:
            logger.warning(f"Failed to update importance for {memory_id}: {e}")

    async def increment_access(self, memory_id: str) -> None:
        client = await get_weaviate_client()
        collection = client.collections.get(COLLECTION_MEMORY)

        try:
            obj = collection.query.fetch_object_by_id(uuid=memory_id)
            if obj:
                current = obj.properties.get("access_count", 0)
                collection.data.update(
                    uuid=memory_id,
                    properties={"access_count": current + 1},
                )
        except Exception as e:
            logger.warning(f"Failed to increment access for {memory_id}: {e}")

    async def list_by_type(self, memory_type: str, limit: int = 100) -> list[dict]:
        client = await get_weaviate_client()
        collection = client.collections.get(COLLECTION_MEMORY)

        results = collection.query.fetch_objects(
            limit=limit,
            filters=wvc.query.Filter.by_property("memory_type").equal(memory_type),
        )

        items: list[dict] = []
        for obj in results.objects:
            props = dict(obj.properties)
            props["id"] = str(obj.uuid)
            items.append(props)
        return items

    async def list_old_memories(self, days: int = 30, limit: int = 1000) -> list[dict]:
        client = await get_weaviate_client()
        collection = client.collections.get(COLLECTION_MEMORY)

        cutoff = datetime.utcnow()
        import dateutil.parser

        results = collection.query.fetch_objects(limit=limit)

        old: list[dict] = []
        for obj in results.objects:
            props = dict(obj.properties)
            created_str = props.get("created_at", "")
            if created_str:
                try:
                    created = dateutil.parser.parse(created_str) if isinstance(created_str, str) else created_str
                    age = (datetime.utcnow() - created).days if isinstance(created, datetime) else 999
                except Exception:
                    age = 999
                if age > days:
                    props["id"] = str(obj.uuid)
                    old.append(props)

        return old


long_term_memory = LongTermMemory()
