import { useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import {
  CardCarousel,
  ConnectionBadge,
  EmptyState,
  ReconnectionBanner,
  SessionStatus,
  ToastProvider,
  TranscriptList,
} from "./components";
import { useSessionStore } from "./state/sessionStore";

const ERROR_TOAST_ID = "session-error";

function ControlButton({
  label,
  onClick,
  variant = "primary",
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-canvas-accent text-white hover:bg-canvas-accentMuted focus-visible:outline-canvas-accent"
      : "bg-transparent text-slate-300 hover:text-white hover:bg-white/5 focus-visible:outline-white";

  return (
    <button className={`${base} ${styles}`} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

export default function App() {
  const {
    sessionState,
    connectionStatus,
    transcripts,
    cards,
    activeCardId,
    isFetching,
    error,
    toggleSession,
    resetSession,
    createCardFromContext,
    setActiveCard,
    fetchInitialData,
    connectTranscription,
  } = useSessionStore();

  useEffect(() => {
    fetchInitialData();
    const disconnect = connectTranscription();
    return () => disconnect();
  }, [fetchInitialData, connectTranscription]);

  useEffect(() => {
    if (error) {
      toast.error(error, { id: ERROR_TOAST_ID });
    } else {
      toast.dismiss(ERROR_TOAST_ID);
    }
  }, [error]);

  const activeCard = useMemo(() => cards.find((card) => card.id === activeCardId) ?? null, [cards, activeCardId]);

  const handleReconnect = () => {
    toast.info("Переподключаемся к трансляции...", { id: "ws-reconnect" });
    connectTranscription();
  };

  return (
    <div className="min-h-screen bg-canvas-background text-white">
      <ToastProvider />
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-canvas-surface/70 p-6 backdrop-blur-lg shadow-card">
          <ReconnectionBanner status={connectionStatus} onReconnect={handleReconnect} />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Состояние сессии</p>
              <SessionStatus state={sessionState} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ControlButton
                label={sessionState === "listening" ? "Поставить на паузу" : "Начать запись"}
                onClick={toggleSession}
              />
              <ControlButton label="Сбросить сессию" onClick={resetSession} variant="ghost" disabled={isFetching} />
              <ControlButton label="Новая карточка" onClick={createCardFromContext} variant="ghost" disabled={isFetching} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Карточек</p>
              <p className="text-2xl font-semibold">{cards.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Фрагментов речи</p>
              <p className="text-2xl font-semibold">{transcripts.length}</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Последнее обновление</p>
                <p className="text-2xl font-semibold">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <ConnectionBadge status={connectionStatus} />
            </div>
          </div>
        </header>

        <main className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-canvas-surface/70 p-6 backdrop-blur-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Транскрипт</h2>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200">
                Live feed
              </span>
            </div>
            {transcripts.length === 0 ? (
              <EmptyState
                title="Транскрипт пуст"
                description="Подключите микрофон и начните сессию, чтобы видеть текст в реальном времени."
              />
            ) : (
              <TranscriptList fragments={transcripts} />
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-canvas-surface/70 p-6 backdrop-blur-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Карточки</h2>
              <span className="text-xs text-slate-400">
                {activeCard ? `Последняя: ${new Date(activeCard.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Нет карточек"}
              </span>
            </div>
            {activeCard ? (
              <div className="flex h-full flex-col gap-4">
                <article className="prose prose-invert max-w-none flex-1 rounded-3xl border border-white/5 bg-white/[0.06] p-6 text-sm shadow-lg shadow-canvas-accent/20">
                  <ReactMarkdown>{activeCard.content}</ReactMarkdown>
                </article>
                <CardCarousel cards={cards} activeCardId={activeCardId} onSelect={setActiveCard} />
              </div>
            ) : (
              <EmptyState
                title="Карточек ещё нет"
                description="Сформируйте первую карточку вручную или подключите API генерации, чтобы выводить тезисы автоматически."
              />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
