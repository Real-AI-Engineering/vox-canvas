import type { SessionState } from "../types/session";

interface SessionStatusProps {
  state: SessionState;
}

const labels: Record<SessionState, string> = {
  idle: "Waiting to start",
  listening: "Recording active",
  paused: "Paused",
};

const colors: Record<SessionState, string> = {
  idle: "bg-slate-500",
  listening: "bg-green-400",
  paused: "bg-yellow-400",
};

export function SessionStatus({ state }: SessionStatusProps) {
  return (
    <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
      <span className={`inline-flex h-2.5 w-2.5 rounded-full ${colors[state]}`} />
      {labels[state]}
    </div>
  );
}
