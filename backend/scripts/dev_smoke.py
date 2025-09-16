"""Lightweight smoke test for the FastAPI backend."""

import contextlib

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@contextlib.contextmanager
def smoke_client() -> TestClient:
    settings = Settings(card_mode="stub", stt_mode="google", session_id="smoke")
    app = create_app(settings)
    with TestClient(app) as client:
        yield client


def main() -> None:
    with smoke_client() as client:
        status = client.get("/api/status")
        status.raise_for_status()
        print("Status:", status.json())

        resp = client.post("/api/cards", json={"prompt": "Smoke test", "context": None})
        resp.raise_for_status()
        print("Card:", resp.json()["title"])

        export = client.get("/api/export")
        export.raise_for_status()
        print("Export contains", len(export.json()["cards"]), "card(s)")

        reset = client.post("/api/session/reset")
        reset.raise_for_status()
        print("Reset:", reset.json())


if __name__ == "__main__":
    main()
