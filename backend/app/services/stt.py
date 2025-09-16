from __future__ import annotations

import asyncio
from dataclasses import dataclass
from enum import Enum
from typing import Any, AsyncIterator, Protocol

import structlog


class TranscriptEventType(str, Enum):
    PARTIAL = "partial"
    FINAL = "final"


@dataclass(slots=True)
class TranscriptEvent:
    """Represents a transcription update emitted by an STT engine."""

    type: TranscriptEventType
    text: str
    confidence: float | None = None
    started_at: float | None = None
    completed_at: float | None = None
    raw: dict[str, Any] | None = None


class STTAdapter(Protocol):
    """Strategy interface for speech-to-text engines."""

    async def run(self, audio_stream: AsyncIterator[bytes]) -> AsyncIterator[TranscriptEvent]:
        """Consume audio chunks and yield transcript events."""


class _BaseAdapter:
    def __init__(self, logger: structlog.stdlib.BoundLogger) -> None:
        self._logger = logger

    async def run(self, audio_stream: AsyncIterator[bytes]) -> AsyncIterator[TranscriptEvent]:  # pragma: no cover - interface
        raise NotImplementedError


class GoogleSpeechAdapter(_BaseAdapter):
    """Placeholder Google Cloud Speech adapter with deterministic stub output."""

    def __init__(self, language: str, logger: structlog.stdlib.BoundLogger) -> None:
        super().__init__(logger.bind(engine="google"))
        self.language = language
        # TODO: replace with real google-cloud-speech streaming implementation.

    async def run(self, audio_stream: AsyncIterator[bytes]) -> AsyncIterator[TranscriptEvent]:
        chunk_index = 0
        buffered: list[str] = []
        started = time.time()
        async for chunk in audio_stream:
            chunk_index += 1
            partial = TranscriptEvent(
                type=TranscriptEventType.PARTIAL,
                text=f"[google stub {chunk_index}]",
                confidence=0.6,
                started_at=started,
                raw={"chunk_index": chunk_index, "language": self.language},
            )
            self._logger.info(
                event="stt.partial",
                chunk=chunk_index,
                size=len(chunk),
                language=self.language,
            )
            buffered.append(partial.text)
            yield partial
        if chunk_index:
            final = TranscriptEvent(
                type=TranscriptEventType.FINAL,
                text=" ".join(buffered),
                confidence=0.75,
                started_at=started,
                completed_at=time.time(),
                raw={"chunks": chunk_index, "language": self.language},
            )
            self._logger.info(event="stt.final", chunks=chunk_index, text=final.text)
            yield final


class VoskAdapter(_BaseAdapter):
    """Placeholder Vosk adapter that mirrors the Google stub."""

    def __init__(self, language: str, logger: structlog.stdlib.BoundLogger) -> None:
        super().__init__(logger.bind(engine="vosk"))
        self.language = language
        # TODO: replace with real vosk Recognizer loop feeding TranscriptEvent objects.

    async def run(self, audio_stream: AsyncIterator[bytes]) -> AsyncIterator[TranscriptEvent]:
        chunk_index = 0
        buffered: list[str] = []
        started = time.time()
        async for chunk in audio_stream:
            chunk_index += 1
            partial = TranscriptEvent(
                type=TranscriptEventType.PARTIAL,
                text=f"[vosk stub {chunk_index}]",
                confidence=None,
                started_at=started,
                raw={"chunk_index": chunk_index, "language": self.language},
            )
            self._logger.info(
                event="stt.partial",
                chunk=chunk_index,
                size=len(chunk),
                language=self.language,
            )
            buffered.append(partial.text)
            yield partial
        if chunk_index:
            final = TranscriptEvent(
                type=TranscriptEventType.FINAL,
                text=" ".join(buffered),
                confidence=None,
                started_at=started,
                completed_at=time.time(),
                raw={"chunks": chunk_index, "language": self.language},
            )
            self._logger.info(event="stt.final", chunks=chunk_index, text=final.text)
            yield final


async def queue_stream(queue: "asyncio.Queue[bytes | None]") -> AsyncIterator[bytes]:
    while True:
        item = await queue.get()
        try:
            if item is None:
                break
            yield item
        finally:
            queue.task_done()


def create_stt_adapter(
    engine: str,
    language: str,
    logger: structlog.stdlib.BoundLogger,
) -> STTAdapter:
    engine_normalized = engine.lower()
    if engine_normalized == "google":
        return GoogleSpeechAdapter(language=language, logger=logger)
    if engine_normalized == "vosk":
        return VoskAdapter(language=language, logger=logger)
    raise ValueError(f"Unsupported STT engine: {engine}")


__all__ = [
    "STTAdapter",
    "TranscriptEvent",
    "TranscriptEventType",
    "create_stt_adapter",
    "GoogleSpeechAdapter",
    "VoskAdapter",
    "queue_stream",
]
