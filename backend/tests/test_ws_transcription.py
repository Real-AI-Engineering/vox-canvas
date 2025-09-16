from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import create_app


def test_websocket_transcription_stub(monkeypatch):
    monkeypatch.setenv("VOX_CARD_MODE", "stub")
    monkeypatch.setenv("VOX_STT_MODE", "google")
    monkeypatch.setenv("VOX_LANGUAGE", "ru-RU")
    monkeypatch.setenv("VOX_STT_FORCE_STUB", "1")
    get_settings.cache_clear()  # type: ignore[attr-defined]

    app = create_app()
    client = TestClient(app)

    with client.websocket_connect("/ws/transcription") as ws:
        ws.send_bytes(b"audio-chunk-1")
        message = ws.receive_json()
        assert message["event"] == "partial"
        assert "google" in message["text"]

    transcript_response = client.get("/api/transcript")
    assert transcript_response.status_code == 200
    transcript = transcript_response.json()["transcript"]
    assert transcript, "Expected transcript fragments"
    assert "google" in transcript[-1]["text"]
    assert transcript[-1]["raw"]["chunks"] == 1
