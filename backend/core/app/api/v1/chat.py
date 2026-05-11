import uuid
import json
import asyncio
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse
from typing import Optional, AsyncIterator

from app.core.model_router import model_router
from app.core.prompt_compiler import prompt_compiler
from app.memory.short_term import short_term_memory
from app.models.base import Message
from app.models.provider_factory import ProviderFactory

router = APIRouter()
logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    model: Optional[str] = None
    task_type: str = Field(default="conversation", description="coding|reasoning|planning|summarization|conversation")
    stream: bool = True


class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str


def _build_chat_messages(session_id: str, user_message: str, system_prompt: Optional[str] = None) -> list[Message]:
    messages: list[Message] = []

    if system_prompt:
        messages.append(Message(role="system", content=system_prompt))
    else:
        messages.append(Message(
            role="system",
            content="You are KRATOS, a sentient agentic operating system with autonomous agents, memory, "
                    "and multi-model orchestration. You are helpful, precise, and powerful. "
                    "Respond concisely in a tone that is intelligent, capable, and slightly futuristic.",
        ))

    messages.append(Message(role="user", content=user_message))
    return messages


async def _stream_llm_response(
    task_type: str,
    messages: list[Message],
    request_model: Optional[str],
    session_id: str,
) -> AsyncIterator[dict]:
    if request_model and request_model != "auto":
        provider = ProviderFactory.get(request_model.split("/")[0] if "/" in request_model else "openrouter")
        if not provider:
            provider = ProviderFactory.get("openai") or list(ProviderFactory.list_names())
    else:
        provider = None

    try:
        if provider:
            stream = provider.stream_completion(
                messages=messages,
                model=request_model or "gpt-4.1-nano",
                temperature=0.7,
                max_tokens=4096,
            )
        else:
            routes = model_router.get_route(task_type)
            if not routes:
                yield {"event": "error", "data": "No model providers configured. Please add a provider in Model Control Center."}
                return

            provider_name, model_name = routes[0]
            provider = ProviderFactory.get(provider_name)
            if not provider:
                yield {"event": "error", "data": f"Provider '{provider_name}' not configured. Add it in Model Control Center."}
                return

            stream = provider.stream_completion(
                messages=messages,
                model=model_name,
                temperature=0.7,
                max_tokens=4096,
            )

        full_content = ""
        async for chunk in stream:
            if chunk.content:
                full_content += chunk.content
                yield {"event": "token", "data": chunk.content}

            if chunk.finish_reason:
                break

        msg_id = str(uuid.uuid4())
        timestamp = "now"
        await short_term_memory.store_message(
            session_id,
            Message(role="assistant", content=full_content),
        )

        yield {
            "event": "done",
            "data": json.dumps({"id": msg_id, "done": True, "model": model_name if provider else "auto"}),
        }

    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield {"event": "error", "data": str(e)}


async def _simulate_stream(message: str) -> AsyncIterator[dict]:
    response_text = (
        f"KRATOS online. No model providers are configured yet.\n\n"
        f"You said: '{message}'\n\n"
        "To enable AI capabilities, add a model provider in the Model Control Center:\n"
        "- OpenAI (set OPENAI_API_KEY in .env)\n"
        "- Anthropic (set ANTHROPIC_API_KEY)\n"
        "- OpenRouter (set OPENROUTER_API_KEY)\n\n"
        "Or use Ollama locally with: ollama pull llama3.2"
    )

    words = response_text.split(" ")
    for i, word in enumerate(words):
        chunk = word + (" " if i < len(words) - 1 else "")
        yield {"event": "token", "data": chunk}
        await asyncio.sleep(0.015)

    msg_id = str(uuid.uuid4())
    yield {"event": "done", "data": json.dumps({"id": msg_id, "done": True})}


@router.post("")
async def send_message(request: ChatRequest):
    session_id = request.session_id or str(uuid.uuid4())

    await short_term_memory.store_message(
        session_id,
        Message(role="user", content=request.message),
    )

    messages = _build_chat_messages(session_id, request.message)

    has_providers = len(ProviderFactory.list_names()) > 0

    async def event_stream():
        try:
            if has_providers:
                async for chunk in _stream_llm_response(
                    request.task_type, messages, request.model, session_id
                ):
                    yield chunk
            else:
                async for chunk in _simulate_stream(request.message):
                    yield chunk
        except Exception as e:
            logger.error(f"Chat error: {e}")
            yield {"event": "error", "data": str(e)}

    return EventSourceResponse(event_stream())


@router.get("/{session_id}/history")
async def get_chat_history(session_id: str):
    messages = await short_term_memory.get_recent_messages(session_id, count=100)
    return {
        "session_id": session_id,
        "messages": [
            {"role": m.role, "content": m.content}
            for m in messages
        ],
    }
