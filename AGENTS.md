# AI Workshop Assistant Agents

## System Topology
- **Frontend presenter** streams 16 kHz PCM audio via `WebSocket /ws/transcription`, requests cards over REST, and renders Markdown.
- **FastAPI backend** orchestrates transcription, card generation, in-memory state, and export.
- **Settings manager** (`app.config.Settings`) centralizes environment flags for repeatable local/dev setups.
- **Speech provider adapters** (Google Cloud STT or Vosk) plug into a unified stream processor.
- **OpenAI card composer** builds prompts, calls GPT models, and returns Markdown payloads with optional media hints.
- **Version hygiene**: устанавливай зависимости только после запроса свежих версий через Context7 (`resolve-library-id` → `get-library-docs`).

```
Browser Mic ──▶ Speech Stream Agent ──▶ STT Adapter ──▶ Transcript Bus ──▶ UI
                   │                         │                             │
                   │                         └─▶ Card Composer ─▶ Card Hub ┘
                   └────────────────────────────────▶ Session Conductor ──▶ Export Agent
```

## Agent Directory
### Session Conductor
- **Purpose**: Owns lifecycle of a workshop session (start/stop, reset, export hooks).
- **Inputs/Outputs**: Receives UI commands via REST, emits session state snapshots.
- **Implementation Hints**: Single `SessionManager` dataclass holding transcript list, card registry, and metadata; expose async-safe methods with `anyio.Lock` to guard concurrent writes.
- **Telemetry**: Emit `session.start`, `session.stop`, `session.export` events with counts of phrases/cards for downstream analysis.
- **Controls**: `POST /api/session/reset` clears runtime state; `GET /api/status?debug=1` exposes live `cards`/`transcripts` counters for dashboards.

### Speech Stream Agent
- **Purpose**: Accepts microphone frames from WebSocket clients and forwards to the active STT adapter with minimal buffering.
- **Inputs/Outputs**: Inbound binary WebSocket messages; outbound partial/final transcript events (JSON) to clients; forward audio chunks to STT adapter coroutine.
- **Implementation Hints**: Use `asyncio.Queue(maxsize=4)` as a pressure valve; chunk duration ≈ 0.5 s to keep latency low.
- **Telemetry**: Track `audio.chunk_received`, `audio.chunk_dropped`, `audio.latency_ms` (wall clock difference between enqueue and STT response).
- **Roadmap**: Swap stub adapters for Google/Vosk streaming engines; include latency & confidence metrics per chunk.

### STT Adapter (Pluggable)
- **Purpose**: Normalize Google Streaming API and Vosk into a common async generator yielding `PartialResult` and `FinalResult` objects.
- **Inputs/Outputs**: Audio frames in, standardized transcription dataclasses out.
- **Implementation Hints**: Strategy pattern with `GoogleSpeechAdapter` and `VoskAdapter`. Each yields `TranscriptEvent(type="partial"|"final", text, confidence, started_at, completed_at)`.
- **Telemetry**: `stt.engine_ready`, `stt.request_started`, `stt.partial`, `stt.final`, `stt.error`. Attach engine metadata (`engine`, `model`, `language`).

### Card Composer Agent
- **Purpose**: Transform prompts + transcript context into Markdown cards using OpenAI GPT models.
- **Inputs/Outputs**: REST `POST /api/cards` payload; returns `Card` object with Markdown, parsed title, optional media descriptor.
- **Implementation Hints**: Use `pydantic` models for request/response, store cards in session manager, stream completions where possible (`AsyncOpenAI.responses.stream`). Ship with a `VOX_CARD_MODE=stub` path so the frontend can integrate before real OpenAI wiring.
- **Resilience**: Default composer enables streaming with exponential backoff retries; errors emit `card.compose_fail` telemetry for the UI.
- **Fallbacks**: When `VOX_CARD_MODE=openai`, use `app.config.Settings` to authorize the OpenAI client; allow overriding the system prompt via `VOX_CARD_SYSTEM_PROMPT`.
- **Telemetry**: `card.compose_start`, `card.compose_success`, `card.compose_fail` with latency, token usage, and prompt source (`manual` vs `auto_context`).
- **Roadmap**: Upgrade to OpenAI Responses streaming with retries and structured error delivery to UI.

### Card Hub Agent
- **Purpose**: Broadcast newly minted cards to all connected clients (primary UI, passive display).
- **Inputs/Outputs**: Consumes card events from `SessionManager`, publishes via WebSocket topic `cards`.
- **Implementation Hints**: Use `asyncio.TaskGroup` to fan-out updates; degrade gracefully if a socket stalls by dropping connection.
- **Telemetry**: `card.broadcast_attempt`, `card.broadcast_delivered`, `card.broadcast_drop` with subscriber identifiers.

### Export Agent
- **Purpose**: Materialize `SessionManager` state into JSON for download.
- **Inputs/Outputs**: Triggered by `GET /api/export`; writes JSON streaming response.
- **Implementation Hints**: Compose export via `orjson.dumps` with default fallback; include schema version for forward compatibility.
- **Telemetry**: `export.start`, `export.success`, `export.fail` with payload size and duration.

## Observability & Startup Tracing
### Structured Logging
- Prefer `structlog` on top of stdlib logging for JSON logs. Configure via `uvicorn --log-config logging.json` so backend and `Speech Stream Agent` share the same sink.
- Log keys: `event`, `agent`, `session_id`, `latency_ms`, `chunk_seq`, `card_id`, `error`.

### Startup Trace Checklist
Emit the following ordered events during application boot to simplify debugging:

| Order | Event Key           | Description & Payload                                             |
|-------|---------------------|-------------------------------------------------------------------|
| 01    | `boot.start`        | Include `version`, `git_sha`, `python`, `uvicorn` version.        |
| 02    | `config.loaded`     | Report detected `.env`/CLI options, redacting secrets.           |
| 03    | `stt.adapter_ready` | Engine selection (`google`/`vosk`), credentials check outcome.    |
| 04    | `openai.ready`      | Test a lightweight `/models` call or cached capability snapshot. |
| 05    | `session.manager`   | Initialise empty transcript/card stores, counts = 0.              |
| 06    | `transport.ready`   | WebSocket + REST routes registered (list routes for sanity).      |
| 07    | `boot.done`         | Timestamp delta from `boot.start`, mark system ready.             |

Enable verbose tracing by setting `VOX_TRACE=1` which raises log level to TRACE for the first 60 seconds after `boot.start` and dumps dependency versions (queried via `uv pip list --format json`).

### Runtime Diagnostics
- Expose `/api/status` details when `?debug=1`: includes CPU load, queue sizes, latest chunk age.
- For front-end, surface a minimal dev overlay toggled by `localStorage.voxDebug=true` showing `partial`/`final` updates, card latencies, and websocket connectivity.

## Tooling & Dependencies
| Scope    | Package / Tool          | Notes (Context7 refs)                                           |
|----------|-------------------------|------------------------------------------------------------------|
| Backend  | FastAPI `^0.115.13`     | `/tiangolo/fastapi` docs; pin minor via `>=0.115.0,<0.116.0`.    |
| Backend  | Uvicorn `0.35.0`        | Latest per `/encode/uvicorn` release notes (2025-06-28).         |
| Backend  | OpenAI Python `1.105.0` | `/openai/openai-python`; install with `[aiohttp]` extra.         |
| Backend  | google-cloud-speech `>=2.27.0` | Confirm via `uv pip index versions`; keep adapter optional. |
| Backend  | vosk `0.3.x`            | `/alphacep/vosk-api`; ship model download helper.                |
| Backend  | structlog `24.x`        | Structured logging for trace events.                             |
| Backend  | pydantic `2.10+`        | Shared DTOs.                                                     |
| Backend  | uv (tool)               | `uv init --package fastapi --python 3.12`; fast installer.       |
| Backend  | ruff `0.6+`             | Lint + format (`ruff check`, `ruff format`).                     |
| Backend  | pytest `8+`             | Unit and integration tests.                                      |
| Frontend | React `18.3+`, Vite `6+`| Quick dev server; align with Tailwind 4 beta when stable.        |
| Frontend | shadcn/ui               | Build accessible card layout components.                         |
| Frontend | Zustand or Jotai        | Manage UI state for transcript & cards.                          |

Set up Python workspace:
```
uv init --package fastapi --python 3.12
uv add "fastapi>=0.115.0,<0.116.0" "uvicorn[standard]==0.35.0" "openai[aiohttp]>=1.105.0" \
       "google-cloud-speech>=2.27.0" "vosk>=0.3.45" structlog>=24.3 pydantic>=2.10 pytest>=8.3 ruff>=0.6
uv run ruff check
```

Frontend bootstrap:
```
pnpm create vite@latest vox-canvas -- --template react-ts
cd vox-canvas
pnpm add -D tailwindcss@latest postcss autoprefixer @types/node ruff # keep JS lint with biomes or eslint
pnpm add @tanstack/react-query zustand @radix-ui/react-dialog class-variance-authority
```

## Failure & Recovery Playbook
- **STT fails**: emit `stt.error` with reason, automatically switch to fallback adapter if available, surface toast in UI.
- **OpenAI timeout**: queue request and surface spinner; allow manual retry with cached prompt.
- **WebSocket drop**: `Speech Stream Agent` attempts clean shutdown, `Session Conductor` retains transcript; front-end replays buffered audio if recorded locally.

## Test Strategy Snapshot
- **Unit**: adapters, card prompt builder, JSON export serializer.
- **Integration**: WebSocket round-trip with fake audio generator, mocked STT responses.
- **Smoke**: end-to-end run script `uv run scripts/dev_smoke.py` logs the startup trace events and performs a dummy card generation.

## Open Questions
- Decide whether to persist JSON exports on disk by default or only on demand.
- Evaluate availability of on-device TTS/translation for multi-language support.
- Confirm licensing for bundling Vosk models inside distribution packages.
