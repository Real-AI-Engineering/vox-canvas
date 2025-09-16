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
    async def compose(self, payload: CardRequestPayload) -> CardResult:  # pragma: no cover - interface
        ...


class StubCardComposer:
    """Placeholder composer that echoes the prompt in Markdown format."""

    def __init__(self, logger: structlog.stdlib.BoundLogger) -> None:
        self._logger = logger.bind(agent="card-composer", mode="stub")

    async def compose(self, payload: CardRequestPayload) -> CardResult:
        await asyncio.sleep(0)
        title = payload.prompt.strip().splitlines()[0][:80] or "Новая карточка"
        markdown = (
            f"# {title}\n"
            "- _Заглушка_: подключение к OpenAI будет добавлено.\n"
            f"- Запрос: {payload.prompt.strip()}\n"
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

    async def compose(self, payload: CardRequestPayload) -> CardResult:  # pragma: no cover - external IO
        messages = [
            {"role": "system", "content": self._system_prompt},
            {"role": "user", "content": payload.prompt if payload.context is None else f"{payload.context}\n\n{payload.prompt}"},
        ]
        self._logger.info(event="card.compose_request", model=self._model)
        try:
            response: Response = await self._client.responses.create(
                model=self._model,
                input=messages,
            )
        except Exception as exc:
            self._logger.error(
                event="card.compose_fail",
                model=self._model,
                error=str(exc),
            )
            raise

        chunks: list[str] = []
        output = getattr(response, "output", [])
        for part in output:
            text_value = getattr(part, "text", None)
            if text_value is not None:
                chunks.append(text_value)
            elif isinstance(part, str):
                chunks.append(part)
        text_content = "".join(chunks)

        title = payload.prompt.strip().splitlines()[0][:80] or "Новая карточка"
        content = CardContent(title=title, markdown=text_content)
        metadata = {
            "mode": "openai",
            "model": self._model,
            "response_id": getattr(response, "id", ""),
        }
        self._logger.info(event="card.compose_success", model=self._model)
        return CardResult(content=content, raw_prompt=payload, metadata=metadata)


def create_card_composer(
    mode: str,
    logger: structlog.stdlib.BoundLogger,
    *,
    model: str,
    system_prompt: str | None = None,
    ) -> CardComposer:
    mode_normalized = mode.lower()
    if mode_normalized == "stub":
        return StubCardComposer(logger=logger)
    if mode_normalized == "openai":  # pragma: no cover - external call
        return OpenAICardComposer(logger=logger, model=model, system_prompt=system_prompt)
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
