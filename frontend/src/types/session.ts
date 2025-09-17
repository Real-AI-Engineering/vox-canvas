export type SessionState = "idle" | "listening" | "paused";
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

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

export interface SessionCard {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  layout?: CardLayout | null;
}
