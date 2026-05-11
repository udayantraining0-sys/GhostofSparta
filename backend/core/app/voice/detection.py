from __future__ import annotations

import logging
import numpy as np

logger = logging.getLogger(__name__)


class WakeWordDetector:
    """Wake word detection placeholder - full implementation uses openwakeword/porcupine."""

    WAKE_WORDS = ["hey kratos", "jarvis", "kratos", "computer"]

    def __init__(self, sensitivity: float = 0.5):
        self.sensitivity = sensitivity

    async def detect(self, audio_chunk: bytes) -> str | None:
        return None


class VoiceActivityDetector:
    """Voice activity detection using energy-based or Silero VAD."""

    def __init__(self, threshold: float = 0.5, silence_duration_ms: int = 800):
        self.threshold = threshold
        self.silence_duration_ms = silence_duration_ms
        self._silence_start: float | None = None
        self._sample_rate = 16000

    def is_speech(self, audio_bytes: bytes) -> bool:
        try:
            samples = np.frombuffer(audio_bytes, dtype=np.int16)
            if len(samples) == 0:
                return False

            energy = np.sqrt(np.mean(samples.astype(np.float32) ** 2))
            normalized = energy / 32768.0

            return normalized > self.threshold * 0.05
        except Exception:
            return False


wake_word_detector = WakeWordDetector()
vad = VoiceActivityDetector()
