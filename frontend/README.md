# Vox Canvas Frontend

React + Vite interface for AI Workshop Assistant. The goal is to display transcription stream, manage cards, and provide a convenient presenter display.

## Stack
- React 19 + TypeScript
- Tailwind CSS 4 (`@tailwindcss/vite`) with custom digital palette
- React Markdown for card content rendering
- Zustand + `react-rnd` for state management and card positioning

## Commands
```bash
pnpm install
pnpm run dev      # start dev server
pnpm run build    # production build
pnpm run preview  # preview built version
pnpm run lint     # ESLint check
```

### Environment Variables
- Copy `.env.example` → `.env` and specify `VITE_API_URL` (default `http://localhost:8000`).
- For first `pnpm install`, approve Tailwind binary execution: `pnpm --dir frontend approve-builds`.

## Interface Architecture
- `src/state/sessionStore.ts` — Zustand store (system prompt, WebSocket, cards, transcript)
- `src/components/StickyCard.tsx` — sticky notes on canvas with drag + resize support (`react-rnd`)
- `src/components/ToastProvider.tsx`, `ReconnectionBanner.tsx`, `SessionStatus.tsx` — notifications and status
- `src/App.tsx` — canvas, card creation form, system prompt editor and transcript history
- `src/index.css` — Tailwind v4 with import via `@import "tailwindcss"`
- `tailwind.config.ts` — theme, colors and plugin configuration (`@tailwindcss/typography`)

## Next Steps
1. Connect real backend (configure `VITE_API_URL`, Google STT/Vosk authentication, OpenAI key).
2. Add successful card creation notifications and additional visual reconnection hints.
3. Set up CI (lint + build) and smoke tests for frontend.
