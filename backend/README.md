# AI Workshop Assistant Backend

This folder holds the FastAPI backend for the offline-first AI Workshop Assistant. It includes:

- Structured startup tracing that emits `boot.*` events for easier diagnostics.
- Pluggable STT adapters (Google Cloud / Vosk) with stubbed streaming responses via WebSocket so the frontend can integrate early.
  - Emit structured telemetry (`TranscriptEvent.raw`) which the WebSocket test asserts against.
- In-memory session manager ready to plug into Google Cloud Speech or Vosk adapters and the OpenAI card composer.
- Card composer service with a stub implementation (default) plus a factory ready for an OpenAI-backed mode.
  - Set `VOX_CARD_MODE=openai` (requires `openai` package) and optionally `VOX_CARD_SYSTEM_PROMPT` for custom instructions.
  - Failures in OpenAI mode emit `card.compose_fail` logs; see `backend/tests/test_card_composer.py` for stubbing patterns.

## Prerequisites
- Python 3.12+
- [`uv`](https://github.com/astral-sh/uv) for dependency management.
- Optional: `pnpm` for the React frontend (lives outside this folder).

## Initial Setup
```bash
uv sync --all-extras --all-dependencies
```
The command installs runtime dependencies plus the `dev` extra (`ruff`, `pytest`, `pytest-asyncio`).

### Configuration
- Settings are managed via `app.config.Settings` (Pydantic). Values come from environment variables or `.env`.
- Tests call `get_settings.cache_clear()` to re-evaluate overrides; do the same in scripts if you modify env vars at runtime.

## Development Workflow
```bash
# Run type checks / lint
uv run ruff check

# Start the API (reload enabled)
uv run uvicorn app.main:app --reload --factory --log-config logging.json
```
Passing `--factory` ensures Uvicorn calls `create_app()` which wires logging and session state correctly.

### Debugging Traces
Set `VOX_TRACE=1` before starting the server to enable verbose telemetry for the first minute of uptime:
```bash
VOX_TRACE=1 uv run uvicorn app.main:app --reload --factory
```
The logs include `audio.chunk_received`, `card.compose_*`, and boot diagnostics in JSON via `structlog`.

### Environment Flags
| Variable            | Description                                      | Default     |
|---------------------|--------------------------------------------------|-------------|
| `VOX_STT_MODE`      | Preferred STT adapter (`google` or `vosk`).      | `google`    |
| `VOX_LANGUAGE`      | Locale passed to the STT adapter.                | `ru-RU`     |
| `VOX_CARD_MODE`     | Card composer strategy (`stub`, `openai`).        | `stub`       |
| `VOX_CARD_SYSTEM_PROMPT` | Override system prompt for OpenAI composer. | default prompt |
| `OPENAI_API_KEY`    | Required when `VOX_CARD_MODE=openai`; consumed by OpenAI SDK. | – |
| `VOX_OPENAI_MODEL`  | Primary OpenAI model identifier.                 | `gpt-4o-mini` |
| `VOX_SESSION_ID`    | Session identifier for log correlation.          | `local`     |
| `VOX_SESSION_TITLE` | Label exported in `GET /api/export`.             | `AI Workshop` |
| `VOX_GIT_SHA`       | Optional commit hash for trace logs.             | –           |
| `VOX_TRACE`         | When set, enables the temporary TRACE window.    | unset       |
| `VOX_LOGGING_CONFIG`| Path to JSON logging config consumed at startup. | `logging.json` |
| `.env`              | Optional file loaded by `Settings`.              | –           |

### Session Utilities
- `POST /api/session/reset` clears transcript and card history in memory.
- `GET /api/status?debug=1` now surfaces `session.cards` and `session.transcripts` counts.

## Testing
Initial scaffolding lives under `backend/tests/`.
```bash
uv run pytest
```

### Handy Commands
The `Makefile` offers quick wrappers:

```bash
make lint   # uv run ruff check
make test   # uv run pytest
make check  # run lint + tests
```

### Quick Smoke Test
Run the in-process smoke script to exercise core endpoints:

```bash
uv run python scripts/dev_smoke.py
```

## Next Steps
1. Implement Google Cloud Speech and Vosk adapters that feed transcripts into `SessionManager.register_transcript_fragment` with confidence/timing metadata.
2. Replace the card stub with real OpenAI `responses` streaming, add retries, and surface `card.compose_fail` telemetry.
3. Fill out end-to-end smoke tests (audio replay + export verification) and wire CI to run `make check`.
