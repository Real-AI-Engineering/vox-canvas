import asyncio

import pytest
import structlog

from app.services import CardRequestPayload, OpenAICardComposer


class _StubPart:
    def __init__(self, text: str) -> None:
        self.text = text


class _StubResponse:
    def __init__(self, response_id: str, parts: list[_StubPart]) -> None:
        self.id = response_id
        self.output = parts


class _StreamEvent:
    def __init__(self, type_: str, **payload) -> None:
        self.type = type_
        for key, value in payload.items():
            setattr(self, key, value)


class _StreamContext:
    def __init__(self, events):
        self._events = events

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):  # noqa: D401 - standard context manager
        return False

    def __aiter__(self):
        async def _gen():
            for event in self._events:
                yield event
        return _gen()


class _StubClient:
    def __init__(self, response: _StubResponse, stream_events) -> None:
        self._response = response
        self._stream_events = stream_events

    class _Responses:
        def __init__(self, response: _StubResponse, stream_events) -> None:
            self._response = response
            self._stream_events = stream_events

        async def create(self, *, model: str, input):  # noqa: A003 - mimic openai signature
            await asyncio.sleep(0)
            return self._response

        def stream(self, *, model: str, input):  # noqa: A003 - mimic openai signature
            return _StreamContext(self._stream_events)

    @property
    def responses(self) -> "_StubClient._Responses":
        return _StubClient._Responses(self._response, self._stream_events)


@pytest.mark.skipif("openai" not in globals(), reason="openai package not installed")
@pytest.mark.asyncio
async def test_openai_composer_success(monkeypatch):
    parts = [_StubPart("# Title\n- Item\n")]
    response = _StubResponse("resp-id", parts)
    stream_events = [
        _StreamEvent("response.output_text.delta", delta=_StreamEvent("delta", text="# Title\n")),
        _StreamEvent("response.output_text.delta", delta=_StreamEvent("delta", text="- Item\n")),
        _StreamEvent("response.completed", response=_StreamEvent("response", id="stream-id")),
    ]
    try:
        composer = OpenAICardComposer(
            logger=structlog.get_logger("test"),
            model="gpt-test",
            client=_StubClient(response, stream_events),
            max_retries=0,
        )
    except RuntimeError as exc:  # pragma: no cover - openai missing
        pytest.skip(str(exc))
    payload = CardRequestPayload(prompt="Generate card", context=None)

    result = await composer.compose(payload)

    assert result.metadata["mode"] == "openai"
    assert result.metadata["response_id"] == "stream-id"
    assert result.content.markdown.startswith("#")


@pytest.mark.skipif("openai" not in globals(), reason="openai package not installed")
@pytest.mark.asyncio
async def test_openai_composer_error(monkeypatch):
    class _FailingResponses:
        async def create(self, *, model: str, input):  # noqa: A003
            raise RuntimeError("boom")

    class _FailingClient:
        responses = _FailingResponses()

    try:
        composer = OpenAICardComposer(
            logger=structlog.get_logger("test"),
            model="gpt-test",
            client=_FailingClient(),
            max_retries=0,
        )
    except RuntimeError as exc:  # pragma: no cover - openai missing
        pytest.skip(str(exc))
    payload = CardRequestPayload(prompt="Generate", context=None)

    with pytest.raises(RuntimeError):
        await composer.compose(payload)
