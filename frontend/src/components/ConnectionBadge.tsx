import type { ConnectionStatus } from "../types/session";

const labels: Record<ConnectionStatus, string> = {
  connected: "WebSocket connected",
  connecting: "WebSocket connecting...",
  disconnected: "WebSocket disconnected",
  error: "WebSocket error",
  reconnecting: "WebSocket reconnecting...",
};

const styles: Record<ConnectionStatus, string> = {
  connected: "bg-green-500/15 text-green-300 border border-green-500/40",
  connecting: "bg-yellow-500/10 text-yellow-300 border border-yellow-500/30",
  disconnected: "bg-white/10 text-slate-300 border border-white/10",
  error: "bg-red-500/10 text-red-300 border border-red-500/30",
  reconnecting: "bg-orange-500/10 text-orange-300 border border-orange-500/30",
};

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  return <span className={`rounded-full px-3 py-1 text-xs ${styles[status]}`}>{labels[status]}</span>;
}
