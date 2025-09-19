from __future__ import annotations

import asyncio
import importlib.metadata as metadata
import json
import logging
import logging.config
import os
import platform
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

import structlog
from fastapi import APIRouter, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .services import (
    CardRequestPayload,
    TranscriptEventType,
    create_card_composer,
    create_stt_adapter,
    queue_stream,
)
from .config import Settings, get_settings

try:
    from fastapi.responses import ORJSONResponse
except ImportError:  # pragma: no cover - fallback if orjson extras unavailable
    from fastapi.responses import JSONResponse as ORJSONResponse  # type: ignore

APP_VERSION = "0.1.0"
TRACE_WINDOW_SECONDS = 60


DEFAULT_SYSTEM_PROMPT = (
    "Assume the user is speaking Russian. You are an AI assistant that generates a summary "
    "card from the provided content or question. The card should be written in Russian. Provide a "
    "concise heading and a brief list of key points. Format the output in Markdown."
)


@dataclass
class SessionManager:
    """In-memory session state with lightweight locking."""

    logger: structlog.stdlib.BoundLogger
    transcript: list[dict[str, Any]] = field(default_factory=list)
    cards: list[dict[str, Any]] = field(default_factory=list)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    system_prompt: str = DEFAULT_SYSTEM_PROMPT

    async def reset(self) -> None:
        async with self.lock:
            self.transcript.clear()
            self.cards.clear()
            self.logger.info(event="session.reset")

    async def stats(self) -> dict[str, int]:
        async with self.lock:
            return {"transcript_count": len(self.transcript), "card_count": len(self.cards)}

    async def snapshot(self) -> dict[str, Any]:
        async with self.lock:
            return {
                "transcript": list(self.transcript),
                "cards": list(self.cards),
            }

    async def register_card(self, card: dict[str, Any]) -> dict[str, Any]:
        async with self.lock:
            self.cards.append(card)
            return card

    async def register_transcript_fragment(self, fragment: dict[str, Any]) -> None:
        async with self.lock:
            self.transcript.append(fragment)

    async def update_card_layout(self, card_id: Any, layout: dict[str, Any]) -> dict[str, Any] | None:
        async with self.lock:
            for card in self.cards:
                if str(card.get("cardId") or card.get("id")) == str(card_id):
                    card["layout"] = layout
                    return card
        return None

    async def update_card(self, card_id: Any, updates: dict[str, Any]) -> dict[str, Any] | None:
        async with self.lock:
            for card in self.cards:
                if str(card.get("cardId") or card.get("id")) == str(card_id):
                    card.update(updates)
                    card["updated_at"] = datetime.now(timezone.utc).isoformat()
                    return card
        return None

    async def get_system_prompt(self) -> str:
        async with self.lock:
            return self.system_prompt

    async def set_system_prompt(self, value: str) -> str:
        async with self.lock:
            self.system_prompt = value
            return self.system_prompt

    async def counts(self) -> dict[str, int]:
        async with self.lock:
            return {"cards": len(self.cards), "transcripts": len(self.transcript)}


class CardLayout(BaseModel):
    x: float
    y: float
    width: float
    height: float
    rotation: float | None = None
    z_index: int | None = Field(default=None, alias="zIndex")

    class Config:
        populate_by_name = True


class CardRequest(BaseModel):
    prompt: str
    context: Optional[str] = None
    layout: Optional[CardLayout] = None
    type: Optional[str] = Field(default="static")  # static, counter, chart, list, summary, keywords, sentiment, custom
    update_rule: Optional[str] = None
    system_prompt: Optional[str] = None
    refresh_interval: Optional[int] = None  # Seconds
    data_source: Optional[str] = Field(default="transcript")  # transcript, external, computed
    auto_update: bool = False
    update_conditions: list[str] = Field(default_factory=list)


def _resolve_log_level(trace_enabled: bool) -> int:
    if trace_enabled:
        logging.addLevelName(5, "TRACE")
        return 5
    return logging.INFO


def _setup_logging(trace_enabled: bool, logging_config_path: str) -> structlog.stdlib.BoundLogger:
    level = _resolve_log_level(trace_enabled)
    if os.path.exists(logging_config_path):
        with open(logging_config_path, "r", encoding="utf-8") as fh:
            logging_config = json.load(fh)
        logging.config.dictConfig(logging_config)
        logging.getLogger().setLevel(level)
    else:
        logging.basicConfig(level=level, format="%(message)s")
    structlog.configure(
        cache_logger_on_first_use=True,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.make_filtering_bound_logger(level),
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.stdlib.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
    )
    return structlog.get_logger("vox.backend")


def _read_pkg_version(name: str) -> str | None:
    try:
        return metadata.version(name)
    except metadata.PackageNotFoundError:  # pragma: no cover - depends on env
        return None


def _log_event(logger: structlog.stdlib.BoundLogger, event: str, **payload: Any) -> None:
    logger.info(event=event, **payload)


def _trace_active(app: FastAPI) -> bool:
    trace_until = getattr(app.state, "trace_until", None)
    return bool(trace_until and time.monotonic() < trace_until)


def _emit_startup_trace(app: FastAPI, settings: Settings) -> None:
    logger: structlog.stdlib.BoundLogger = app.state.logger
    boot_started = time.perf_counter()
    app.state.boot_started = boot_started

    _log_event(
        logger,
        "boot.start",
        version=APP_VERSION,
        python=platform.python_version(),
        platform=platform.platform(),
        fastapi=_read_pkg_version("fastapi"),
        uvicorn=_read_pkg_version("uvicorn"),
        structlog_version=_read_pkg_version("structlog"),
        git_sha=settings.git_sha,
    )

    stt_mode = settings.stt_mode
    openai_model = settings.openai_model
    _log_event(
        logger,
        "config.loaded",
        stt_mode=stt_mode,
        openai_model=openai_model,
        trace_enabled=_trace_active(app),
        config_sources=["env"],
    )

    _log_event(
        logger,
        "stt.adapter_ready",
        engine=stt_mode,
        status="stub",
        language=settings.stt_language,
    )

    _log_event(
        logger,
        "openai.ready",
        status="skipped",
        reason="offline bootstrap stub",
        model=openai_model,
    )

    session_stats = app.state.session_manager.logger.bind(agent="session")
    _log_event(
        session_stats,
        "session.manager",
        transcript_count=0,
        card_count=0,
    )

    routes_summary = [
        {"path": route.path, "methods": sorted(route.methods or set())}
        for route in app.router.routes
        if hasattr(route, "methods")
    ]
    routes_summary.append({"path": "/ws/transcription", "methods": ["WEBSOCKET"]})
    _log_event(
        logger,
        "transport.ready",
        routes=routes_summary,
    )

    duration_ms = (time.perf_counter() - boot_started) * 1000
    _log_event(logger, "boot.done", duration_ms=round(duration_ms, 2))


def create_app(settings: Settings | None = None) -> FastAPI:
    if settings is None:
        settings = get_settings()
    trace_enabled = settings.trace_enabled
    logger = _setup_logging(trace_enabled, settings.logging_config)
    app = FastAPI(title=settings.app_name, version=APP_VERSION)

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5173",
            "http://localhost",
            "http://vox.local",
            "http://api.vox.local"
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.state.logger = logger
    app.state.trace_until = (
        time.monotonic() + TRACE_WINDOW_SECONDS if trace_enabled else None
    )
    app.state.session_manager = SessionManager(logger=logger)
    app.state.session_id = settings.session_id
    app.state.settings = settings
    card_mode = settings.card_mode
    try:
        model_name = settings.gemini_model if card_mode == "gemini" else settings.openai_model
        app.state.card_composer = create_card_composer(
            mode=card_mode,
            logger=logger,
            model=model_name,
            system_prompt=os.getenv("VOX_CARD_SYSTEM_PROMPT"),
            api_key=settings.gemini_api_key if card_mode == "gemini" else None,
        )
    except ValueError as exc:  # pragma: no cover - config guard
        logger.error(event="card.composer_error", error=str(exc))
        raise

    api_router = APIRouter(prefix="/api", tags=["api"])

    @api_router.get("/status")
    async def status(request: Request, debug: bool = False) -> dict[str, Any]:
        payload: dict[str, Any] = {"status": "ok"}
        if debug:
            stats = await app.state.session_manager.counts()
            payload["debug"] = {
                "session_id": app.state.session_id,
                "trace_active": _trace_active(app),
                "session": stats,
            }
        return payload

    @api_router.get("/health")
    async def health() -> dict[str, Any]:
        """Health check endpoint for Docker container monitoring."""
        try:
            # Basic health checks
            stats = await app.state.session_manager.counts()

            # Check if essential services are responsive
            health_status = {
                "status": "healthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "version": APP_VERSION,
                "session": {
                    "cards": stats["cards"],
                    "transcripts": stats["transcripts"]
                },
                "services": {
                    "stt_adapter": "available",
                    "card_composer": "available"
                }
            }

            return health_status
        except Exception as exc:
            # Return unhealthy status on any error
            logger.error(event="health.check_failed", error=str(exc))
            raise HTTPException(status_code=503, detail={
                "status": "unhealthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(exc)
            })

    @api_router.get("/transcript")
    async def transcript() -> dict[str, Any]:
        snapshot = await app.state.session_manager.snapshot()
        return {"transcript": snapshot["transcript"]}

    @api_router.post("/session/reset")
    async def reset_session() -> dict[str, Any]:
        await app.state.session_manager.reset()
        counts = await app.state.session_manager.counts()
        _log_event(logger, "session.reset", **counts)
        return {"status": "reset", "session": counts}

    @api_router.post("/cards")
    async def create_card(request: CardRequest) -> dict[str, Any]:
        start = time.perf_counter()
        card_logger = logger.bind(agent="card", prompt_length=len(request.prompt))
        _log_event(card_logger, "card.compose_start", source="manual")

        composer = app.state.card_composer
        system_prompt = await app.state.session_manager.get_system_prompt()
        payload = CardRequestPayload(
            prompt=request.prompt,
            context=request.context,
            system_prompt=request.system_prompt or system_prompt,
            card_type=request.type,
            refresh_interval=request.refresh_interval,
            data_source=request.data_source,
            auto_update=request.auto_update,
            update_conditions=request.update_conditions,
        )
        result = await composer.compose(payload, system_prompt=system_prompt)

        created_at = result.content.created_at.isoformat()
        layout_payload = request.layout.model_dump(by_alias=True) if request.layout else None
        card_payload = {
            "cardId": len(app.state.session_manager.cards) + 1,
            "title": result.content.title,
            "contentMarkdown": result.content.markdown,
            "created_at": created_at,
            "updated_at": None,
            "image_url": result.content.image_url,
            "prompt": request.prompt,
            "type": request.type,
            "update_rule": request.update_rule,
            "context": request.context,
            "layout": layout_payload,
            "metadata": result.metadata,
            "system_prompt": request.system_prompt,
            "refresh_interval": request.refresh_interval,
            "data_source": request.data_source,
            "auto_update": request.auto_update,
            "update_conditions": request.update_conditions,
        }
        stored_card = await app.state.session_manager.register_card(card_payload)

        latency_ms = (time.perf_counter() - start) * 1000
        _log_event(
            card_logger,
            "card.compose_success",
            card_id=stored_card["cardId"],
            latency_ms=round(latency_ms, 2),
            composer_mode=result.metadata.get("mode"),
        )
        return stored_card

    @api_router.get("/cards")
    async def list_cards() -> dict[str, Any]:
        snapshot = await app.state.session_manager.snapshot()
        return {"cards": snapshot["cards"]}

    @api_router.get("/system-prompt")
    async def get_system_prompt() -> dict[str, Any]:
        value = await app.state.session_manager.get_system_prompt()
        return {"system_prompt": value}

    @api_router.put("/system-prompt")
    async def update_system_prompt(payload: dict[str, str]) -> dict[str, Any]:
        new_prompt = payload.get("system_prompt")
        if new_prompt is None:
            raise HTTPException(status_code=400, detail="system_prompt is required")
        value = await app.state.session_manager.set_system_prompt(new_prompt)
        _log_event(logger, "system_prompt.updated")
        return {"system_prompt": value}

    @api_router.patch("/cards/{card_id}")
    async def update_card_layout(card_id: str, payload: CardLayout) -> dict[str, Any]:
        updated = await app.state.session_manager.update_card_layout(
            card_id, payload.model_dump(by_alias=True)
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Card not found")
        return updated

    @api_router.put("/cards/{card_id}")
    async def update_card(card_id: str, request: CardRequest) -> dict[str, Any]:
        updates = {
            "prompt": request.prompt,
            "type": request.type,
            "update_rule": request.update_rule,
        }
        if request.context is not None:
            updates["context"] = request.context
        if request.layout is not None:
            updates["layout"] = request.layout.model_dump(by_alias=True)

        updated = await app.state.session_manager.update_card(card_id, updates)
        if not updated:
            raise HTTPException(status_code=404, detail="Card not found")

        _log_event(logger, "card.updated", card_id=card_id)
        return updated

    @api_router.get("/export")
    async def export() -> ORJSONResponse:
        snapshot = await app.state.session_manager.snapshot()
        payload = {
            "session_title": settings.session_title,
            "date": datetime.now(timezone.utc).isoformat(),
            "transcript": snapshot["transcript"],
            "cards": snapshot["cards"],
        }
        _log_event(logger, "export.start", cards=len(payload["cards"]))
        response = ORJSONResponse(payload)
        _log_event(logger, "export.success", size_bytes=len(response.body))
        return response

    app.include_router(api_router)

    @app.on_event("startup")
    async def on_startup() -> None:  # pragma: no cover - event handler wiring
        _emit_startup_trace(app, settings)

    @app.websocket("/ws/transcription")
    async def transcription_ws(websocket: WebSocket) -> None:
        await websocket.accept()
        connection_logger = logger.bind(agent="speech-stream")
        _log_event(connection_logger, "ws.open", path="/ws/transcription")

        engine = settings.stt_mode
        language = settings.stt_language
        session_manager: SessionManager = app.state.session_manager

        try:
            adapter = create_stt_adapter(engine=engine, language=language, logger=connection_logger)
        except ValueError as exc:
            _log_event(connection_logger, "stt.error", error=str(exc))
            await websocket.close(code=1011)
            return

        audio_queue: asyncio.Queue[bytes | None] = asyncio.Queue(maxsize=8)

        async def send_heartbeat() -> None:
            """Send periodic ping frames to keep WebSocket connection alive."""
            try:
                while True:
                    await asyncio.sleep(settings.websocket_heartbeat_interval)
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.ping()
                        _log_event(connection_logger, "ws.heartbeat_sent")
                    else:
                        break
            except Exception as exc:
                _log_event(connection_logger, "ws.heartbeat_error", error=str(exc))

        async def forward_transcripts() -> None:
            try:
                async for event in adapter.run(queue_stream(audio_queue)):
                    # Format message for frontend
                    payload = {
                        "type": "transcription",
                        "text": event.text,
                        "speaker": "Host",  # Default speaker
                        "confidence": event.confidence if event.confidence is not None else 0.9,
                        "is_final": event.type is TranscriptEventType.FINAL
                    }

                    should_register = event.type is TranscriptEventType.FINAL
                    fragment = None
                    if should_register:
                        fragment = {
                            "time": datetime.now(timezone.utc).strftime("%H:%M:%S"),
                            "text": event.text,
                            "confidence": event.confidence,
                            "speaker": "Host",
                            "raw": event.raw,
                        }
                    try:
                        await websocket.send_json(payload)
                        _log_event(connection_logger, "ws.sent_transcription",
                                   text_length=len(event.text),
                                   is_final=should_register)
                    except RuntimeError:
                        if should_register and fragment:
                            await session_manager.register_transcript_fragment(fragment)
                        break
                    else:
                        if should_register and fragment:
                            await session_manager.register_transcript_fragment(fragment)
            except Exception as exc:  # pragma: no cover - defensive logging
                _log_event(connection_logger, "stt.error", error=str(exc))
                raise

        transcript_task = asyncio.create_task(forward_transcripts())
        heartbeat_task = asyncio.create_task(send_heartbeat())

        chunk_seq = 0
        try:
            while True:
                message = await websocket.receive()
                data = message.get("bytes") or message.get("text")
                if data is None:
                    _log_event(connection_logger, "ws.null_data_received", chunk_seq=chunk_seq)
                    continue
                chunk_seq += 1
                if isinstance(data, (bytes, bytearray)):
                    data_bytes = bytes(data)
                else:
                    data_bytes = str(data).encode("utf-8")

                # Log audio chunk details
                _log_event(
                    connection_logger,
                    "audio.chunk_received",
                    chunk_seq=chunk_seq,
                    size=len(data_bytes),
                    queue_size=audio_queue.qsize()
                )

                await audio_queue.put(data_bytes)
        except WebSocketDisconnect:
            _log_event(connection_logger, "ws.close", chunks=chunk_seq, reason="disconnect")
        except Exception as exc:  # pragma: no cover - defensive logging
            _log_event(connection_logger, "ws.error", error=str(exc), chunks=chunk_seq)
            await websocket.close(code=1011)
            raise
        finally:
            await audio_queue.put(None)

            # Cancel heartbeat task
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:  # pragma: no cover - cleanup
                pass

            try:
                await transcript_task
            except asyncio.CancelledError:  # pragma: no cover - cleanup
                pass
            except Exception as exc:  # pragma: no cover - surfaced earlier
                _log_event(connection_logger, "stt.error", error=str(exc))

    return app


app = create_app()
