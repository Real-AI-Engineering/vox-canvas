export type SessionState = "idle" | "listening" | "paused";
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error" | "reconnecting";

export interface TranscriptFragment {
  id: string;
  time: string;
  text: string;
  speaker?: string;
  confidence?: number | null;
}

export interface CardLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number | null;
  zIndex?: number | null;
}

export type CardType = "static" | "counter" | "chart" | "list";

export interface SessionCard {
  id: string;
  title: string;
  content: string;
  type: CardType;
  prompt: string;
  updateRule?: string | null;
  liveData?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  layout?: CardLayout | null;
}
