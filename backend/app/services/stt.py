from __future__ import annotations

import asyncio
import json
import os
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, AsyncIterator, Protocol

import structlog

try:  # pragma: no cover - optional dependency
    from google.cloud import speech_v1p1beta1 as speech
except ImportError:  # pragma: no cover - graceful fallback
    speech = None

try:  # pragma: no cover - optional dependency
    from vosk import KaldiRecognizer, Model
except ImportError:  # pragma: no cover - graceful fallback
    KaldiRecognizer = None
    Model = None


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


class StubAdapter(_BaseAdapter):
    """Deterministic adapter used when real engines are unavailable."""

    def __init__(self, engine: str, language: str, logger: structlog.stdlib.BoundLogger) -> None:
        super().__init__(logger.bind(engine=engine, mode="stub"))
        self.engine = engine
        self.language = language
        # Simulated phrases for demo
        self.demo_phrases = [
            "Добро пожаловать в систему транскрибации",
            "Голосовой ввод работает корректно",
            "Это демонстрационный режим транскрипции",
            "Вы можете видеть текст в реальном времени",
            "Система готова к работе с Google Speech API",
        ]
        self.phrase_index = 0

    async def run(self, audio_stream: AsyncIterator[bytes]) -> AsyncIterator[TranscriptEvent]:
        chunk_index = 0
        started = time.time()
        current_phrase = ""

        async for chunk in audio_stream:
            chunk_index += 1

            # Simulate gradual phrase building every 3 chunks
            if chunk_index % 3 == 0 and self.phrase_index < len(self.demo_phrases):
                current_phrase = self.demo_phrases[self.phrase_index]
                words = current_phrase.split()

                # Build phrase word by word
                word_count = min(len(words), (chunk_index // 3))
                partial_text = " ".join(words[:word_count])

                partial = TranscriptEvent(
                    type=TranscriptEventType.PARTIAL,
                    text=partial_text,
                    confidence=0.85,
                    started_at=started,
                    raw={"chunk_index": chunk_index, "language": self.language, "stub": True},
                )
                self._logger.info(
                    event="stt.partial",
                    chunk=chunk_index,
                    size=len(chunk),
                    text=partial_text,
                    language=self.language,
                )
                yield partial

                # Complete phrase every 9 chunks
                if chunk_index % 9 == 0:
                    final = TranscriptEvent(
                        type=TranscriptEventType.FINAL,
                        text=current_phrase,
                        confidence=0.95,
                        started_at=started,
                        completed_at=time.time(),
                        raw={"chunks": chunk_index, "language": self.language, "stub": True},
                    )
                    self._logger.info(event="stt.final", chunks=chunk_index, text=current_phrase)
                    yield final
                    self.phrase_index = (self.phrase_index + 1) % len(self.demo_phrases)
                    current_phrase = ""


class GoogleSpeechAdapter(_BaseAdapter):
    """Integrates Google Cloud Speech-to-Text streaming API."""

    def __init__(
        self,
        language: str,
        logger: structlog.stdlib.BoundLogger,
        *,
        client: Any | None = None,
        sample_rate: int = 16_000,
        enable_automatic_punctuation: bool = True,
    ) -> None:
        if speech is None:  # pragma: no cover - dependency guard
            raise RuntimeError("google-cloud-speech is not installed")
        super().__init__(logger.bind(engine="google", mode="google-cloud"))
        self.language = language

        # Import credentials here to load them properly
        from google.oauth2 import service_account

        # Log credentials path for debugging
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        logger.info(event="google.init", cred_path=cred_path)

        if client is not None:
            # Use provided client (for testing)
            self._client = client
        elif cred_path and os.path.exists(cred_path):
            logger.info(event="google.loading_credentials", path=cred_path, size=os.path.getsize(cred_path))
            credentials = service_account.Credentials.from_service_account_file(cred_path)
            self._client = speech.SpeechAsyncClient(credentials=credentials)
        else:
            logger.error(event="google.no_credentials", path=cred_path)
            # This will use Application Default Credentials
            self._client = speech.SpeechAsyncClient()

        # Support multiple sample rates (browsers typically use 48000 or 44100)
        self._configs = {}
        for rate in [16000, 44100, 48000]:
            self._configs[rate] = speech.StreamingRecognitionConfig(
                config=speech.RecognitionConfig(
                    encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                    sample_rate_hertz=rate,
                    language_code=language,
                    enable_automatic_punctuation=enable_automatic_punctuation,
                ),
                interim_results=True,
            )
        # Default to 48000 which is most common
        self._config = self._configs[48000]

    async def run(self, audio_stream: AsyncIterator[bytes]) -> AsyncIterator[TranscriptEvent]:  # pragma: no cover - network I/O
        assert speech is not None
        self._logger.info(event="google.run_start", language=self.language)

        chunk_count = 0
        total_bytes = 0

        async def request_generator() -> AsyncIterator[speech.StreamingRecognizeRequest]:
            nonlocal chunk_count, total_bytes
            self._logger.info(event="google.sending_config")
            yield speech.StreamingRecognizeRequest(streaming_config=self._config)

            async for chunk in audio_stream:
                chunk_count += 1
                chunk_size = len(chunk)
                total_bytes += chunk_size

                if chunk_count % 10 == 0:  # Log every 10th chunk
                    self._logger.info(
                        event="google.audio_chunk",
                        chunk=chunk_count,
                        size=chunk_size,
                        total_bytes=total_bytes
                    )

                yield speech.StreamingRecognizeRequest(audio_content=chunk)

            self._logger.info(event="google.audio_stream_ended", chunks=chunk_count, bytes=total_bytes)

        started = time.time()

        try:
            self._logger.info(event="google.creating_stream")
            streaming_call = await self._client.streaming_recognize(requests=request_generator())
            self._logger.info(event="google.stream_established")

            response_count = 0
            async for response in streaming_call:
                response_count += 1
                self._logger.info(event="google.response_received", num=response_count)

                for result in response.results:
                    if not result.alternatives:
                        continue
                    alternative = result.alternatives[0]
                    event_type = TranscriptEventType.FINAL if result.is_final else TranscriptEventType.PARTIAL
                    confidence = alternative.confidence if result.is_final else None

                    payload = TranscriptEvent(
                        type=event_type,
                        text=alternative.transcript.strip(),
                        confidence=confidence,
                        started_at=started,
                        completed_at=time.time() if result.is_final else None,
                        raw={
                            "is_final": result.is_final,
                            "stability": result.stability,
                            "language": self.language,
                        },
                    )

                    event_name = "stt.final" if result.is_final else "stt.partial"
                    self._logger.info(
                        event=event_name,
                        confidence=confidence,
                        text=payload.text,
                        response_num=response_count
                    )
                    yield payload

        except Exception as e:
            self._logger.error(event="google.error", error=str(e), exc_info=True)
            raise


class VoskAdapter(_BaseAdapter):
    """Integrates the Vosk offline recognizer."""

    def __init__(
        self,
        language: str,
        logger: structlog.stdlib.BoundLogger,
        *,
        model_path: str | None = None,
        sample_rate: int = 16_000,
    ) -> None:
        if Model is None or KaldiRecognizer is None:  # pragma: no cover - dependency guard
            raise RuntimeError("vosk is not installed")
        super().__init__(logger.bind(engine="vosk", mode="vosk"))
        path = model_path or os.getenv("VOX_VOSK_MODEL_PATH")
        if not path:
            raise RuntimeError("VOX_VOSK_MODEL_PATH is not configured")
        self.language = language
        self._model = Model(path)
        self._sample_rate = sample_rate

    async def run(self, audio_stream: AsyncIterator[bytes]) -> AsyncIterator[TranscriptEvent]:  # pragma: no cover - heavy dependency
        recognizer = KaldiRecognizer(self._model, self._sample_rate)
        recognizer.SetWords(True)
        started = time.time()
        async for chunk in audio_stream:
            accepted = await asyncio.to_thread(recognizer.AcceptWaveform, bytes(chunk))
            if accepted:
                result_json = await asyncio.to_thread(recognizer.Result)
                result_data = json.loads(result_json)
                text = result_data.get("text", "").strip()
                if text:
                    confidence = _average_confidence(result_data.get("result", []))
                    event = TranscriptEvent(
                        type=TranscriptEventType.FINAL,
                        text=text,
                        confidence=confidence,
                        started_at=started,
                        completed_at=time.time(),
                        raw=result_data,
                    )
                    self._logger.info(event="stt.final", confidence=confidence, text=text)
                    yield event
            else:
                partial_json = await asyncio.to_thread(recognizer.PartialResult)
                partial_data = json.loads(partial_json)
                partial_text = partial_data.get("partial", "").strip()
                if partial_text:
                    event = TranscriptEvent(
                        type=TranscriptEventType.PARTIAL,
                        text=partial_text,
                        confidence=None,
                        started_at=started,
                        raw=partial_data,
                    )
                    self._logger.info(event="stt.partial", text=partial_text)
                    yield event
        final_json = await asyncio.to_thread(recognizer.FinalResult)
        final_data = json.loads(final_json)
        final_text = final_data.get("text", "").strip()
        if final_text:
            confidence = _average_confidence(final_data.get("result", []))
            event = TranscriptEvent(
                type=TranscriptEventType.FINAL,
                text=final_text,
                confidence=confidence,
                started_at=started,
                completed_at=time.time(),
                raw=final_data,
            )
            self._logger.info(event="stt.final", confidence=confidence, text=final_text)
            yield event


def _average_confidence(words: list[dict[str, Any]]) -> float | None:
    if not words:
        return None
    confidences = [word.get("conf") for word in words if word.get("conf") is not None]
    if not confidences:
        return None
    return sum(confidences) / len(confidences)


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
    # Set Google credentials path if not already set
    # Go up two directories from app/services/stt.py to get to backend/
    current_file = os.path.abspath(__file__)  # app/services/stt.py
    services_dir = os.path.dirname(current_file)  # app/services/
    app_dir = os.path.dirname(services_dir)  # app/
    backend_dir = os.path.dirname(app_dir)  # backend/
    credentials_path = os.path.join(backend_dir, "google-credentials.json")

    if os.path.exists(credentials_path):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
        logger.info(event="stt.credentials_set", path=credentials_path, size=os.path.getsize(credentials_path))

        # Verify JSON is valid
        try:
            import json
            with open(credentials_path, 'r') as f:
                creds = json.load(f)
                logger.info(event="stt.credentials_loaded", project_id=creds.get('project_id'))
        except Exception as e:
            logger.error(event="stt.credentials_parse_error", error=str(e))
    else:
        logger.error(event="stt.no_credentials_file", path=credentials_path)

    force_stub = os.getenv("VOX_STT_FORCE_STUB") == "1"
    engine_normalized = engine.lower()
    logger.info(event="stt.adapter_config", engine=engine_normalized, force_stub=force_stub, stub_env=os.getenv('VOX_STT_FORCE_STUB'), creds_env=os.getenv('GOOGLE_APPLICATION_CREDENTIALS'))

    if engine_normalized == "google" and not force_stub:
        if speech is not None:  # pragma: no branch - dependency check
            try:
                sample_rate = int(os.getenv("VOX_GOOGLE_SAMPLE_RATE", "16000"))
                logger.info(event="stt.creating_google", language=language, sample_rate=sample_rate)
                return GoogleSpeechAdapter(language=language, logger=logger, sample_rate=sample_rate)
            except Exception as e:
                logger.error(event="stt.google_create_error", error=str(e), exc_info=True)
                logger.warning("Falling back to stub adapter due to Google Speech error")
                return StubAdapter(engine=engine_normalized, language=language, logger=logger)
        logger.warning("google-cloud-speech missing; falling back to stub", engine=engine)
    if engine_normalized == "vosk" and not force_stub:
        if KaldiRecognizer is not None and Model is not None:
            model_path = os.getenv("VOX_VOSK_MODEL_PATH")
            sample_rate = int(os.getenv("VOX_VOSK_SAMPLE_RATE", "16000"))
            return VoskAdapter(language=language, logger=logger, model_path=model_path, sample_rate=sample_rate)
        logger.warning("vosk not available; falling back to stub", engine=engine)
    if engine_normalized in {"google", "vosk"}:
        return StubAdapter(engine=engine_normalized, language=language, logger=logger)
    raise ValueError(f"Unsupported STT engine: {engine}")


__all__ = [
    "STTAdapter",
    "TranscriptEvent",
    "TranscriptEventType",
    "create_stt_adapter",
    "GoogleSpeechAdapter",
    "VoskAdapter",
    "StubAdapter",
    "queue_stream",
]
