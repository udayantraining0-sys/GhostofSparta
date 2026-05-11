from __future__ import annotations

import io
import logging
from typing import AsyncIterator

logger = logging.getLogger(__name__)


class SpeechToText:
    """Speech-to-text using Whisper (OpenAI API or local faster-whisper)."""

    async def transcribe_file(self, audio_bytes: bytes, filename: str = "audio.wav") -> str:
        try:
            from openai import OpenAI
            client = OpenAI()
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = filename
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )
            return transcript.text
        except Exception as e:
            logger.warning(f"Whisper API failed: {e}, trying local...")
            return await self._transcribe_local(audio_bytes)

    async def _transcribe_local(self, audio_bytes: bytes) -> str:
        try:
            from faster_whisper import WhisperModel
            import tempfile
            import os

            model = WhisperModel("base", device="cpu", compute_type="int8")
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                f.write(audio_bytes)
                temp_path = f.name

            segments, _ = model.transcribe(temp_path)
            text = " ".join(seg.text for seg in segments)

            os.unlink(temp_path)
            return text
        except ImportError:
            logger.warning("faster-whisper not installed")
            return ""
        except Exception as e:
            logger.error(f"Local STT failed: {e}")
            return ""


class TextToSpeech:
    """Text-to-speech using Kokoro (local) or ElevenLabs (cloud)."""

    async def generate(self, text: str, voice: str = "default", provider: str = "kokoro") -> bytes:
        if provider == "elevenlabs":
            return await self._elevenlabs_tts(text, voice)
        elif provider == "kokoro":
            return await self._kokoro_tts(text, voice)
        else:
            return await self._kokoro_tts(text, voice)

    async def _kokoro_tts(self, text: str, voice: str = "af_heart") -> bytes:
        try:
            from kokoro import KPipeline
            import soundfile as sf
            import numpy as np

            pipeline = KPipeline(lang_code='a')
            generator = pipeline(text, voice=voice, speed=1.0)

            all_audio: list[np.ndarray] = []
            for _, _, audio in generator:
                all_audio.append(audio)

            if not all_audio:
                return b""

            combined = np.concatenate(all_audio)

            buffer = io.BytesIO()
            sf.write(buffer, combined, 24000, format='WAV')
            return buffer.getvalue()

        except ImportError:
            logger.warning("Kokoro not installed, using silent fallback")
            return self._silence_fallback()
        except Exception as e:
            logger.error(f"Kokoro TTS failed: {e}")
            return self._silence_fallback()

    async def _elevenlabs_tts(self, text: str, voice: str = "default") -> bytes:
        try:
            import httpx
            import os

            api_key = os.environ.get("ELEVENLABS_API_KEY", "")
            if not api_key:
                return await self._kokoro_tts(text, voice)

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
                    json={"text": text, "model_id": "eleven_turbo_v2_5"},
                    headers={"xi-api-key": api_key},
                    timeout=30,
                )
                return response.content
        except Exception as e:
            logger.error(f"ElevenLabs TTS failed: {e}")
            return await self._kokoro_tts(text, voice)

    def _silence_fallback(self) -> bytes:
        return b""


stt = SpeechToText()
tts = TextToSpeech()
