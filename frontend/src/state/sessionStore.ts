import { create } from "zustand";

import { demoCards, demoTranscripts } from "../data/demo";
import { AudioRecorder } from "../services/audioRecorder";
import type {
  ConnectionStatus,
  SessionCard,
  SessionState,
  TranscriptFragment,
} from "../types/session";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface SessionStore {
  sessionState: SessionState;
  connectionStatus: ConnectionStatus;
  transcripts: TranscriptFragment[];
  cards: SessionCard[];
  activeCardId: string | null;
  isFetching: boolean;
  error: string | null;
  pendingFragmentId: string | null;
  cleanupSocket: (() => void) | null;
  setActiveCard: (id: string) => void;
  toggleSession: () => void;
  resetSession: () => Promise<void>;
  fetchInitialData: () => Promise<void>;
  createCardFromContext: () => Promise<void>;
  connectTranscription: () => () => void;
}

function buildUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function buildWsUrl(path: string) {
  const url = new URL(path, API_BASE_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Create audio recorder instance
const audioRecorder = new AudioRecorder();

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionState: "idle",
  connectionStatus: "disconnected",
  transcripts: [],
  cards: [],
  activeCardId: null,
  isFetching: false,
  error: null,
  pendingFragmentId: null,
  cleanupSocket: null,
  setActiveCard: (id) => set({ activeCardId: id }),
  toggleSession: async () => {
    const state = get();
    if (state.sessionState === "idle" || state.sessionState === "paused") {
      // Start recording
      const started = await audioRecorder.startRecording();
      if (started) {
        set({ sessionState: "listening" });
      }
    } else if (state.sessionState === "listening") {
      // Stop recording
      audioRecorder.stopRecording();
      set({ sessionState: "paused" });
    }
  },
  resetSession: async () => {
    set({ isFetching: true, error: null });
    try {
      const response = await fetch(buildUrl("/api/session/reset"), { method: "POST" });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      set({
        transcripts: [],
        cards: [],
        activeCardId: null,
        pendingFragmentId: null,
      });
    } catch (error) {
      console.warn("Reset session failed", error);
      set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      set({ isFetching: false });
    }
  },
  fetchInitialData: async () => {
    set({ isFetching: true, error: null });
    try {
      const [cardsRes, transcriptRes] = await Promise.all([
        fetch(buildUrl("/api/cards")),
        fetch(buildUrl("/api/transcript")),
      ]);

      if (cardsRes.ok) {
        const data = await cardsRes.json();
        const cards: SessionCard[] = data.cards ?? data ?? [];
        set({ cards, activeCardId: cards.at(-1)?.id ?? null });
      }

      if (transcriptRes.ok) {
        const data = await transcriptRes.json();
        const transcript: TranscriptFragment[] = data.transcript ?? data ?? [];
        set({ transcripts: transcript });
      }
    } catch (error) {
      console.warn("Using demo data due to fetch error", error);
      set({
        error: error instanceof Error ? error.message : String(error),
        connectionStatus: "error",
      });
    } finally {
      set({ isFetching: false });
    }
  },
  createCardFromContext: async () => {
    const state = get();
    const { transcripts, cards } = state;
    const prompt = transcripts
      .slice(-3)
      .map((fragment) => fragment.text)
      .join(" ")
      .trim();

    try {
      set({ isFetching: true, error: null });
      const response = await fetch(buildUrl("/api/cards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt || "Сформируй карточку по последней теме." }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const newCard: SessionCard = {
        id: String(payload.cardId ?? payload.id ?? `card-${Date.now()}`),
        title: payload.title ?? "Карточка",
        content: payload.contentMarkdown ?? payload.content ?? "",
        createdAt: payload.created_at ?? payload.createdAt ?? new Date().toISOString(),
        metadata: payload.metadata ?? null,
      };

      set({
        cards: [...cards, newCard],
        activeCardId: newCard.id,
        isFetching: false,
        error: null,
      });
    } catch (error) {
      console.warn("Failed to create card, using fallback", error);
      const fallback: SessionCard = {
        id: `fallback-${Date.now()}`,
        title: "Локальная карточка",
        content: `# Локальная карточка\n- Используйте API, чтобы заменить заглушку.\n- Время: ${nowLabel()}\n- Контекст: ${prompt || "нет данных"}.`,
        createdAt: new Date().toISOString(),
      };
      set({
        cards: [...cards, fallback],
        activeCardId: fallback.id,
        isFetching: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  connectTranscription: () => {
    const previousCleanup = get().cleanupSocket;
    if (previousCleanup) {
      previousCleanup();
    }

    const wsUrl = buildWsUrl("/ws/transcription");
    let socket: WebSocket | null = null;
    let closed = false;

    try {
      socket = new WebSocket(wsUrl);
    } catch (error) {
      console.warn("WebSocket connection failed", error);
      set({ connectionStatus: "error" });
      return () => undefined;
    }

    // Set up audio recorder to send data via WebSocket
    audioRecorder.onData((audioData) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(audioData);
      }
    });

    set({ connectionStatus: "connecting", cleanupSocket: null });

    const cleanup = () => {
      closed = true;
      socket?.close();
      set({ connectionStatus: "disconnected" });
    };

    socket.addEventListener("open", () => {
      if (closed) return;
      set({ connectionStatus: "connected", error: null, cleanupSocket: cleanup });
    });

    socket.addEventListener("message", (event) => {
      if (closed) return;
      try {
        const payload = JSON.parse(event.data);
        console.log("WebSocket message received:", payload); // Debug log

        // Check different message formats from backend
        const { type, event: eventType, text, confidence, is_final } = payload;

        if (!text) return;

        // Handle different event types: "transcription" with is_final flag, or legacy "transcript"/"final"
        const isFinal = is_final || type === "transcription" && is_final === true || eventType === "transcript" || eventType === "final";
        const timestamp = nowLabel();
        set((state) => {
          const partialId = state.pendingFragmentId;
          if (!isFinal) {
            // For partial transcripts, update existing pending fragment or create new one
            const id = partialId ?? `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const partialFragment: TranscriptFragment = {
              id,
              time: timestamp,
              text,
              speaker: "Live",
              confidence: confidence ?? null,
            };

            const transcripts = partialId
              ? state.transcripts.map((fragment) => (fragment.id === partialId ? partialFragment : fragment))
              : [...state.transcripts, partialFragment];

            return {
              transcripts: transcripts.slice(-200),
              pendingFragmentId: id,
            };
          }

          // For final transcripts, replace pending or add new
          const finalId = partialId ?? `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const finalFragment: TranscriptFragment = {
            id: finalId,
            time: timestamp,
            text,
            speaker: "Live",
            confidence: confidence ?? null,
          };

          const transcripts = partialId
            ? state.transcripts.map((fragment) => (fragment.id === partialId ? finalFragment : fragment))
            : [...state.transcripts, finalFragment];

          return {
            transcripts: transcripts.slice(-200),
            pendingFragmentId: null,
          };
        });
      } catch (error) {
        console.warn("Failed to parse websocket payload", error);
      }
    });

    socket.addEventListener("close", () => {
      if (closed) return;
      set({ connectionStatus: "disconnected", error: "WebSocket соединение закрыто", cleanupSocket: null });
    });

    socket.addEventListener("error", (event) => {
      console.error("WebSocket error", event);
      set({
        connectionStatus: "error",
        error: "Ошибка соединения с трансляцией",
        cleanupSocket: null,
      });
    });

    set({ cleanupSocket: cleanup });
    return cleanup;
  },
}));
