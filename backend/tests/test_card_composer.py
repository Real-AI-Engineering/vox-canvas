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


class _StubClient:
    def __init__(self, response: _StubResponse) -> None:
        self._response = response

    class _Responses:
        def __init__(self, response: _StubResponse) -> None:
            self._response = response

        async def create(self, *, model: str, input):  # noqa: A003 - mimic openai signature
            await asyncio.sleep(0)
            return self._response

    @property
    def responses(self) -> "_StubClient._Responses":
        return _StubClient._Responses(self._response)


@pytest.mark.skipif("openai" not in globals(), reason="openai package not installed")
@pytest.mark.asyncio
async def test_openai_composer_success(monkeypatch):
    parts = [_StubPart("# Title\n- Item\n")]
    response = _StubResponse("resp-id", parts)
    try:
        composer = OpenAICardComposer(
            logger=structlog.get_logger("test"),
            model="gpt-test",
            client=_StubClient(response),
        )
    except RuntimeError as exc:  # pragma: no cover - openai missing
        pytest.skip(str(exc))
    payload = CardRequestPayload(prompt="Generate card", context=None)

    result = await composer.compose(payload)

    assert result.metadata["mode"] == "openai"
    assert result.metadata["response_id"] == "resp-id"
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
        )
    except RuntimeError as exc:  # pragma: no cover - openai missing
        pytest.skip(str(exc))
    payload = CardRequestPayload(prompt="Generate", context=None)

    with pytest.raises(RuntimeError):
        await composer.compose(payload)
