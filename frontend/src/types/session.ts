export type SessionState = "idle" | "listening" | "paused";
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface TranscriptFragment {
  id: string;
  time: string;
  text: string;
  speaker?: string;
  confidence?: number | null;
}

export interface SessionCard {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}
