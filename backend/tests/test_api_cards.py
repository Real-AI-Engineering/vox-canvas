import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import create_app


def _build_app(monkeypatch) -> TestClient:
    monkeypatch.setenv("VOX_CARD_MODE", "stub")
    monkeypatch.delenv("VOX_CARD_SYSTEM_PROMPT", raising=False)
    monkeypatch.setenv("VOX_STT_MODE", "google")
    monkeypatch.setenv("VOX_SESSION_ID", "test-session")
    get_settings.cache_clear()  # type: ignore[attr-defined]
    app = create_app()
    return TestClient(app)


def test_create_card_returns_stub_content(monkeypatch):
    client = _build_app(monkeypatch)
    with client:
        response = client.post(
            "/api/cards",
            json={"prompt": "Карточка тест", "context": None},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Карточка тест"
    assert "Заглушка" in body["contentMarkdown"]
    assert body["metadata"]["mode"] == "stub"


def test_export_contains_cards(monkeypatch):
    client = _build_app(monkeypatch)
    with client:
        client.post("/api/cards", json={"prompt": "Экспорт", "context": None})
        response = client.get("/api/export")
    assert response.status_code == 200
    exported = response.json()
    assert exported["session_title"] == "AI Workshop"
    assert exported["cards"], "Expected exported cards"
    assert exported["cards"][0]["title"] == "Экспорт"


@pytest.mark.asyncio
async def test_counts_helper(monkeypatch):
    client = _build_app(monkeypatch)
    session_manager = client.app.state.session_manager
    counts = await session_manager.counts()
    assert counts == {"cards": 0, "transcripts": 0}


def test_status_debug(monkeypatch):
    client = _build_app(monkeypatch)
    response = client.get("/api/status", params={"debug": True})
    assert response.status_code == 200
    data = response.json()["debug"]
    assert data["session"]["cards"] == 0
    assert data["session"]["transcripts"] == 0


def test_reset_session(monkeypatch):
    client = _build_app(monkeypatch)
    with client:
        client.post("/api/cards", json={"prompt": "Экспорт", "context": None})
        reset_response = client.post("/api/session/reset")
    assert reset_response.status_code == 200
    payload = reset_response.json()
    assert payload["status"] == "reset"
    assert payload["session"] == {"cards": 0, "transcripts": 0}
