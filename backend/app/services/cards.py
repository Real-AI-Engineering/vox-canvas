from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Protocol

import structlog

try:
    from openai import AsyncOpenAI
    from openai.types import Response  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    AsyncOpenAI = None  # type: ignore
    Response = Any  # type: ignore


@dataclass(slots=True)
class CardRequestPayload:
    prompt: str
    context: str | None = None
    system_prompt: str | None = None
    card_type: str | None = None
    refresh_interval: int | None = None  # Seconds
    data_source: str | None = None  # transcript, external, computed
    auto_update: bool = False
    update_conditions: list[str] = field(default_factory=list)


@dataclass(slots=True)
class CardContent:
    title: str
    markdown: str
    image_url: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(slots=True)
class CardResult:
    content: CardContent
    raw_prompt: CardRequestPayload
    metadata: dict[str, str]


class CardComposer(Protocol):
    async def compose(self, payload: CardRequestPayload, *, system_prompt: str | None = None) -> CardResult:  # pragma: no cover - interface
        ...


class StubCardComposer:
    """Placeholder composer that echoes the prompt in Markdown format."""

    def __init__(self, logger: structlog.stdlib.BoundLogger) -> None:
        self._logger = logger.bind(agent="card-composer", mode="stub")

    async def compose(self, payload: CardRequestPayload, *, system_prompt: str | None = None) -> CardResult:
        await asyncio.sleep(0)

        # Generate appropriate title based on card type
        if payload.card_type == "summary":
            title = "Summary"
        elif payload.card_type == "keywords":
            title = "Keywords"
        elif payload.card_type == "sentiment":
            title = "Sentiment"
        elif payload.card_type == "counter":
            title = "Counter"
        elif payload.card_type == "custom":
            title = "Custom"
        else:
            # For static and other types, use first line of prompt as before
            title = payload.prompt.strip().splitlines()[0][:80] or "New Card"

        # Generate type-specific stub content
        if payload.card_type == "summary":
            markdown = "**Configuration Required**\n\nTo generate summaries, please configure OpenAI or Gemini API keys.\n\n_Stub_: OpenAI connection will be added."
        elif payload.card_type == "keywords":
            markdown = "**Configuration Required**\n\nTo extract keywords, please configure OpenAI or Gemini API keys.\n\n_Stub_: OpenAI connection will be added."
        elif payload.card_type == "sentiment":
            markdown = "**Configuration Required**\n\nTo analyze sentiment, please configure OpenAI or Gemini API keys.\n\n_Stub_: OpenAI connection will be added."
        elif payload.card_type == "counter":
            markdown = "**Configuration Required**\n\nTo count items, please configure OpenAI or Gemini API keys.\n\n_Stub_: OpenAI connection will be added."
        elif payload.card_type == "custom":
            markdown = f"**Configuration Required**\n\nTo generate custom content, please configure OpenAI or Gemini API keys.\n\nPrompt: {payload.prompt.strip()}\n\n_Stub_: OpenAI connection will be added."
        else:
            # For static and other types, show the original format
            markdown = (
                f"# {title}\n"
                "- _Stub_: OpenAI connection will be added.\n"
                f"- Request: {payload.prompt.strip()}\n"
            )
        content = CardContent(title=title, markdown=markdown)
        metadata = {"mode": "stub"}
        self._logger.info(event="card.compose_stub", title=title)
        return CardResult(content=content, raw_prompt=payload, metadata=metadata)

class OpenAICardComposer:
    """Placeholder OpenAI composer that logs the intended request payload."""

    def __init__(
        self,
        logger: structlog.stdlib.BoundLogger,
        model: str,
        system_prompt: str | None = None,
        *,
        client: AsyncOpenAI | None = None,
        use_streaming: bool = True,
        max_retries: int = 2,
        backoff_seconds: float = 0.5,
    ) -> None:
        if AsyncOpenAI is None:  # pragma: no cover - dependency guard
            raise RuntimeError("openai-python is not installed")
        self._logger = logger.bind(agent="card-composer", mode="openai")
        # TODO: allow dependency-injection of throttled client + retry policy.
        self._client = client or AsyncOpenAI()
        self._model = model
        self._system_prompt = system_prompt or (
            "Assume the user is speaking Russian. You are an AI assistant that generates a summary "
            "card from the provided content or question. The card should be written in Russian. Provide "
            "a concise heading and a brief list of key points. Format the output in Markdown."
        )
        self._use_streaming = use_streaming
        self._max_retries = max_retries
        self._backoff = backoff_seconds

    async def compose(self, payload: CardRequestPayload, *, system_prompt: str | None = None) -> CardResult:  # pragma: no cover - external IO
        messages = [
            {
                "role": "system",
                "content": system_prompt or payload.system_prompt or self._system_prompt,
            },
            {"role": "user", "content": payload.prompt if payload.context is None else f"{payload.context}\n\n{payload.prompt}"},
        ]
        attempt = 0
        last_exc: Exception | None = None
        while attempt <= self._max_retries:
            try:
                response_id, markdown = await self._compose_once(messages)

                # Generate appropriate title based on card type
                if payload.card_type == "summary":
                    title = "Summary"
                elif payload.card_type == "keywords":
                    title = "Keywords"
                elif payload.card_type == "sentiment":
                    title = "Sentiment"
                elif payload.card_type == "counter":
                    title = "Counter"
                elif payload.card_type == "custom":
                    title = "Custom"
                else:
                    # For static and other types, use first line of prompt as before
                    title = payload.prompt.strip().splitlines()[0][:80] or "New Card"

                content = CardContent(title=title, markdown=markdown)
                metadata = {
                    "mode": "openai",
                    "model": self._model,
                    "response_id": response_id or "",
                }
                self._logger.info(event="card.compose_success", model=self._model, attempt=attempt + 1)
                return CardResult(content=content, raw_prompt=payload, metadata=metadata)
            except Exception as exc:  # pragma: no cover - network error path
                last_exc = exc
                self._logger.error(
                    event="card.compose_fail",
                    model=self._model,
                    attempt=attempt + 1,
                    error=str(exc),
                )
                if attempt >= self._max_retries:
                    raise
                await asyncio.sleep(self._backoff * (2 ** attempt))
                attempt += 1
        if last_exc:  # pragma: no cover - defensive
            raise last_exc
        raise RuntimeError("OpenAI composer failed without exception")

    async def _compose_once(self, messages: list[dict[str, str]]) -> tuple[str | None, str]:
        if self._use_streaming and hasattr(self._client, "responses") and hasattr(self._client.responses, "stream"):
            try:
                return await self._collect_stream(messages)
            except Exception as exc:  # pragma: no cover - streaming failure
                self._logger.warning("Streaming failed, falling back to create", error=str(exc))
        response: Response = await self._client.responses.create(model=self._model, input=messages)
        return getattr(response, "id", None), _coalesce_output(response)

    async def _collect_stream(self, messages: list[dict[str, str]]) -> tuple[str | None, str]:
        stream = self._client.responses.stream(model=self._model, input=messages)
        chunks: list[str] = []
        response_id: str | None = None
        async with stream as events:  # type: ignore[assignment]
            async for event in events:
                event_type = _get_attr(event, "type")
                if event_type in {"response.output_text.delta", "output_text.delta", "delta"}:
                    delta = _get_attr(event, "delta")
                    text = _get_attr(delta, "text") or _get_attr(delta, "content")
                    if text:
                        chunks.append(text)
                elif event_type in {"response.completed", "completed"}:
                    response_obj = _get_attr(event, "response")
                    response_id = _get_attr(response_obj, "id") or response_id
                elif event_type in {"response.error", "error"}:
                    detail = _get_attr(event, "error")
                    raise RuntimeError(f"OpenAI streaming error: {detail}")
        return response_id, "".join(chunks)


def create_card_composer(
    mode: str,
    logger: structlog.stdlib.BoundLogger,
    *,
    model: str,
    system_prompt: str | None = None,
    api_key: str | None = None,
) -> CardComposer:
    mode_normalized = mode.lower()
    if mode_normalized == "stub":
        return StubCardComposer(logger=logger)
    if mode_normalized == "openai":  # pragma: no cover - external call
        return OpenAICardComposer(logger=logger, model=model, system_prompt=system_prompt)
    if mode_normalized == "gemini":
        try:
            from .gemini_composer import GeminiCardComposer
            return GeminiCardComposer(logger=logger, model=model, api_key=api_key)
        except ImportError:
            logger.error("gemini-composer import failed, falling back to stub")
            return StubCardComposer(logger=logger)
    raise ValueError(f"Unknown card composer mode: {mode}")


__all__ = [
    "CardComposer",
    "CardRequestPayload",
    "CardContent",
    "CardResult",
    "StubCardComposer",
    "OpenAICardComposer",
    "create_card_composer",
]


def _get_attr(obj: Any, attr: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(attr, default)
    return getattr(obj, attr, default)


def _coalesce_output(response: Any) -> str:
    chunks: list[str] = []
    output = getattr(response, "output", [])
    for part in output:
        text_value = _get_attr(part, "text")
        if text_value:
            chunks.append(text_value)
        elif isinstance(part, str):
            chunks.append(part)
    return "".join(chunks)
