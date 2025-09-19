import type { ConnectionStatus } from "../types/session";

interface ReconnectionBannerProps {
  status: ConnectionStatus;
  onReconnect?: () => void;
}

const labels: Record<ConnectionStatus, string> = {
  connected: "Connection established",
  connecting: "Attempting to reconnect...",
  disconnected: "Connection lost",
  error: "Connection error",
  reconnecting: "Reconnecting...",
};

export function ReconnectionBanner({ status, onReconnect }: ReconnectionBannerProps) {
  if (status === "connected") {
    return null;
  }

  const isRetrying = status === "connecting";

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
      <span>{labels[status]}</span>
      <button
        className="rounded-full border border-blue-500/60 px-3 py-1 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onReconnect}
        disabled={isRetrying}
      >
        {isRetrying ? "Reconnecting..." : "Retry"}
      </button>
    </div>
  );
}
