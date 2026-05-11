from __future__ import annotations

import json
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.voice.speech import stt, tts
from app.core.model_router import model_router
from app.models.base import Message
from app.models.provider_factory import ProviderFactory

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/voice")
async def voice_websocket(websocket: WebSocket):
    await websocket.accept()
    logger.info("Voice WebSocket connected")

    await websocket.send_text(json.dumps({"type": "ready", "message": "Voice interface ready"}))

    try:
        while True:
            data = await websocket.receive_json()

            msg_type = data.get("type", "")

            if msg_type == "stt":
                audio_b64 = data.get("audio", "")
                if audio_b64:
                    import base64
                    audio_bytes = base64.b64decode(audio_b64)
                    text = await stt.transcribe_file(audio_bytes)
                    await websocket.send_text(json.dumps({
                        "type": "transcription",
                        "text": text,
                        "is_final": True,
                    }))

            elif msg_type == "tts":
                text = data.get("text", "")
                voice = data.get("voice", "default")
                provider = data.get("provider", "kokoro")

                audio_bytes = await tts.generate(text, voice, provider)
                if audio_bytes:
                    import base64
                    audio_b64 = base64.b64encode(audio_bytes).decode()
                    await websocket.send_text(json.dumps({
                        "type": "audio",
                        "data": audio_b64,
                        "format": "wav",
                    }))

            elif msg_type == "chat_voice":
                text = data.get("text", "")

                try:
                    async for chunk in tts.generate_stream(text):
                        import base64 as b64
                        audio_b64 = b64.b64encode(chunk).decode() if isinstance(chunk, bytes) else chunk
                        await websocket.send_text(json.dumps({
                            "type": "audio_chunk",
                            "data": audio_b64,
                        }))
                except Exception as e:
                    full_audio = await tts.generate(text)
                    import base64 as b64
                    await websocket.send_text(json.dumps({
                        "type": "audio",
                        "data": b64.b64encode(full_audio).decode(),
                    }))

    except WebSocketDisconnect:
        logger.info("Voice WebSocket disconnected")
    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}")
