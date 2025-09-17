import { create } from "zustand";

import { AudioRecorder } from "../services/audioRecorder";
import type {
  CardLayout,
  CardType,
  ConnectionStatus,
  SessionCard,
  SessionState,
  TranscriptFragment,
} from "../types/session";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const DEFAULT_SYSTEM_PROMPT =
  "Assume the user is speaking Russian. You are an AI assistant that generates a summary " +
  "card from the provided content or question. The card should be written in Russian. Provide a " +
  "concise heading and a brief list of key points. Format the output in Markdown.";

interface CreateCardOptions {
  context?: string;
  layout?: CardLayout;
  type?: CardType;
}

interface SessionStore {
  sessionState: SessionState;
  connectionStatus: ConnectionStatus;
  transcripts: TranscriptFragment[];
  cards: SessionCard[];
  activeCardId: string | null;
  systemPrompt: string;
  isFetching: boolean;
  isSavingSystemPrompt: boolean;
  error: string | null;
  pendingFragmentId: string | null;
  cleanupSocket: (() => void) | null;
  setActiveCard: (id: string) => void;
  toggleSession: () => void;
  resetSession: () => Promise<void>;
  fetchInitialData: () => Promise<void>;
  createCard: (prompt: string, options?: CreateCardOptions) => Promise<void>;
  updateCard: (cardId: string, updates: Partial<SessionCard>) => Promise<void>;
  updateCardLayout: (cardId: string, layout: CardLayout) => Promise<void>;
  setSystemPrompt: (value: string) => void;
  saveSystemPrompt: (value: string) => Promise<void>;
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
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  isFetching: false,
  isSavingSystemPrompt: false,
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
      const [cardsRes, transcriptRes, promptRes] = await Promise.all([
        fetch(buildUrl("/api/cards")),
        fetch(buildUrl("/api/transcript")),
        fetch(buildUrl("/api/system-prompt")),
      ]);

      if (cardsRes.ok) {
        const data = await cardsRes.json();
        const rawCards = data.cards ?? data ?? [];
        // Transform backend format to frontend format
        const cards: SessionCard[] = rawCards.map((card: any) => ({
          id: String(card.cardId ?? card.id),
          title: card.title,
          content: card.contentMarkdown ?? card.content,
          type: card.type ?? "static",
          prompt: card.prompt,
          updateRule: card.update_rule ?? card.updateRule ?? null,
          liveData: card.liveData ?? null,
          createdAt: card.created_at ?? card.createdAt,
          updatedAt: card.updated_at ?? card.updatedAt ?? null,
          metadata: card.metadata ?? null,
          layout: card.layout ?? null,
        }));
        console.log('Loaded cards from backend:', cards);
        set({ cards, activeCardId: cards.at(-1)?.id ?? null });
      }

      if (transcriptRes.ok) {
        const data = await transcriptRes.json();
        const transcript: TranscriptFragment[] = data.transcript ?? data ?? [];
        console.log('Loaded transcripts from backend:', transcript);
        set({ transcripts: transcript });
      }

      if (promptRes.ok) {
        const data = await promptRes.json();
        if (typeof data.system_prompt === "string") {
          set({ systemPrompt: data.system_prompt });
        }
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
  createCard: async (prompt, options) => {
    const state = get();
    try {
      set({ isFetching: true, error: null });
      const response = await fetch(buildUrl("/api/cards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          context: options?.context,
          layout: options?.layout,
          type: options?.type ?? "static",
          update_rule: options?.type === "counter" ? prompt : null,
        }),
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const payload = await response.json();
      const newCard: SessionCard = {
        id: String(payload.cardId ?? payload.id ?? `card-${Date.now()}`),
        title: payload.title ?? "Карточка",
        content: payload.contentMarkdown ?? payload.content ?? "",
        type: payload.type ?? options?.type ?? "static",
        prompt: prompt,
        updateRule: options?.type === "counter" ? prompt : (payload.updateRule ?? null),
        liveData: payload.liveData ?? null,
        createdAt: payload.created_at ?? payload.createdAt ?? new Date().toISOString(),
        updatedAt: null,
        metadata: payload.metadata ?? null,
        layout: payload.layout ?? options?.layout ?? null,
      };
      console.log('Created new card:', newCard);
      console.log('Card type:', newCard.type, 'Update rule:', newCard.updateRule);
      set({
        cards: [...state.cards, newCard],
        activeCardId: newCard.id,
        isFetching: false,
      });
    } catch (error) {
      console.warn("Failed to create card", error);
      set({
        error: error instanceof Error ? error.message : String(error),
        isFetching: false,
      });
    }
  },
  updateCard: async (cardId, updates) => {
    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === cardId
          ? { ...card, ...updates, updatedAt: new Date().toISOString() }
          : card
      ),
    }));
    try {
      const payload = {
        prompt: updates.prompt,
        type: updates.type || "static",
        update_rule: updates.updateRule || null,
        context: updates.context || null,
      };
      await fetch(buildUrl(`/api/cards/${encodeURIComponent(cardId)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn("Failed to update card", error);
      set({ error: error instanceof Error ? error.message : String(error) });
    }
  },
  updateCardLayout: async (cardId, layout) => {
    set((state) => ({
      cards: state.cards.map((card) => (card.id === cardId ? { ...card, layout } : card)),
    }));
    try {
      await fetch(buildUrl(`/api/cards/${encodeURIComponent(cardId)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout),
      });
    } catch (error) {
      console.warn("Failed to persist layout", error);
      set({ error: error instanceof Error ? error.message : String(error) });
    }
  },
  setSystemPrompt: (value) => set({ systemPrompt: value }),
  saveSystemPrompt: async (value) => {
    set({ isSavingSystemPrompt: true, error: null });
    try {
      const response = await fetch(buildUrl("/api/system-prompt"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_prompt: value }),
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      set({ systemPrompt: value });
    } catch (error) {
      console.warn("Failed to save system prompt", error);
      set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      set({ isSavingSystemPrompt: false });
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

    set({ connectionStatus: "connecting", cleanupSocket: null });

    // Set up audio recorder to send data via WebSocket
    audioRecorder.onData((audioData) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(audioData);
      }
    });

    const cleanup = () => {
      closed = true;
      socket?.close();
      useSessionStore.setState({ connectionStatus: "disconnected", cleanupSocket: null });
    };

    socket.addEventListener("open", () => {
      if (closed) return;
      useSessionStore.setState({ connectionStatus: "connected", error: null, cleanupSocket: cleanup });
    });

    socket.addEventListener("message", (event) => {
      if (closed) return;
      try {
        const payload = JSON.parse(event.data);
        const text: string | undefined = payload.text;
        const eventType: string | undefined = payload.event ?? payload.type;
        const confidence: number | undefined = payload.confidence ?? payload.confidence_score;
        const isFinalFlag =
          payload.is_final === true ||
          payload.final === true ||
          eventType === "transcript" ||
          eventType === "final";

        if (!text) {
          return;
        }

        const timestamp = nowLabel();

        // Use useSessionStore.setState directly to avoid closure issues
        useSessionStore.setState((state) => {
          const partialId = state.pendingFragmentId;

          if (!isFinalFlag) {
            const id = partialId ?? `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const fragment: TranscriptFragment = {
              id,
              time: timestamp,
              text,
              speaker: "Live",
              confidence: confidence ?? null,
            };

            const transcripts = partialId
              ? state.transcripts.map((item) => (item.id === partialId ? fragment : item))
              : [...state.transcripts, fragment];

            return {
              transcripts: transcripts.slice(-200),
              pendingFragmentId: id,
            };
          }

          const id = partialId ?? `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const finalFragment: TranscriptFragment = {
            id,
            time: timestamp,
            text,
            speaker: "Live",
            confidence: confidence ?? null,
          };

          const transcripts = partialId
            ? state.transcripts.map((item) => (item.id === partialId ? finalFragment : item))
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
      useSessionStore.setState({ connectionStatus: "disconnected", error: "WebSocket соединение закрыто", cleanupSocket: null });
    });

    socket.addEventListener("error", (event) => {
      console.error("WebSocket error", event);
      useSessionStore.setState({ connectionStatus: "error", error: "Ошибка соединения с трансляцией", cleanupSocket: null });
    });

    set({ cleanupSocket: cleanup });
    return cleanup;
  },
}));
