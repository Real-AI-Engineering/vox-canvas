import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import {
  CardCarousel,
  ConnectionBadge,
  EmptyState,
  ReconnectionBanner,
  SessionStatus,
  StickyCard,
  ToastProvider,
  TranscriptList,
} from "./components";
import { useSessionStore } from "./state/sessionStore";
import type { CardLayout } from "./types/session";

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
    systemPrompt,
    isFetching,
    isSavingSystemPrompt,
    error,
    toggleSession,
    resetSession,
    createCard,
    updateCardLayout,
    setActiveCard,
    fetchInitialData,
    connectTranscription,
    saveSystemPrompt,
  } = useSessionStore();

  const [cardPrompt, setCardPrompt] = useState("");
  const [useTranscriptContext, setUseTranscriptContext] = useState(true);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showTranscriptPanel, setShowTranscriptPanel] = useState(false);
  const [promptDraft, setPromptDraft] = useState(systemPrompt);

  useEffect(() => {
    const disconnect = connectTranscription();
    fetchInitialData();
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPromptDraft(systemPrompt);
  }, [systemPrompt]);

  useEffect(() => {
    if (error) {
      toast.error(error, { id: ERROR_TOAST_ID });
    } else {
      toast.dismiss(ERROR_TOAST_ID);
    }
  }, [error]);

  const activeCard = useMemo(() => cards.find((card) => card.id === activeCardId) ?? null, [cards, activeCardId]);

  const transcriptContext = useMemo(() => {
    if (!useTranscriptContext || transcripts.length === 0) return undefined;
    return transcripts
      .slice(-5)
      .map((fragment) => fragment.text)
      .join(" \n");
  }, [transcripts, useTranscriptContext]);

  const nextCardLayout = (): CardLayout => {
    const baseX = 80 + cards.length * 30;
    const baseY = 80 + cards.length * 20;
    return {
      x: baseX % 640,
      y: baseY % 480,
      width: 320,
      height: 240,
      zIndex: (cards.length % 5) + 1,
    };
  };

  const handleCreateCard = async () => {
    const prompt = cardPrompt.trim();
    if (!prompt) {
      toast.error("Введите запрос для карточки");
      return;
    }
    await createCard(prompt, {
      context: transcriptContext,
      layout: nextCardLayout(),
    });
    setCardPrompt("");
  };

  const handleSavePrompt = async () => {
    await saveSystemPrompt(promptDraft.trim());
    toast.success("Системный промпт обновлён");
    setShowPromptEditor(false);
  };

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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-400">Состояние сессии</p>
              <SessionStatus state={sessionState} />
              <ConnectionBadge status={connectionStatus} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ControlButton
                label={sessionState === "listening" ? "Поставить на паузу" : "Начать запись"}
                onClick={toggleSession}
              />
              <ControlButton label="Сбросить сессию" onClick={resetSession} variant="ghost" disabled={isFetching} />
              <ControlButton
                label="Система"
                onClick={() => setShowPromptEditor(true)}
                variant="ghost"
              />
              <ControlButton
                label={showTranscriptPanel ? "Скрыть транскрипт" : "Показать транскрипт"}
                onClick={() => setShowTranscriptPanel((prev) => !prev)}
                variant="ghost"
              />
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
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Последнее обновление</p>
              <p className="text-2xl font-semibold">
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <textarea
              value={cardPrompt}
              onChange={(event) => setCardPrompt(event.target.value)}
              placeholder="Опишите, какую карточку сгенерировать"
              className="min-h-[72px] flex-1 resize-y rounded-xl border border-white/10 bg-canvas-background/60 p-3 text-sm text-white outline-none focus:border-canvas-accent"
            />
            <div className="flex w-full flex-col gap-3 sm:w-auto">
              <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={useTranscriptContext}
                  onChange={(event) => setUseTranscriptContext(event.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-canvas-accent focus:ring-canvas-accent"
                />
                Использовать недавний транскрипт
              </label>
              <ControlButton label="Создать карточку" onClick={handleCreateCard} disabled={isFetching} />
            </div>
          </div>
        </header>

        <main className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-canvas-surface/40 backdrop-blur">
          {cards.length === 0 ? (
            <EmptyState
              title="Карточек ещё нет"
              description="Добавьте первую карточку, описав желаемый результат в форме выше."
            />
          ) : (
            <div className="relative h-full w-full">
              {cards.map((card) => (
                <StickyCard key={card.id} card={card} onLayoutChange={updateCardLayout} />
              ))}
            </div>
          )}
        </main>

        {activeCard && (
          <section className="rounded-3xl border border-white/10 bg-canvas-surface/70 p-6 backdrop-blur-lg">
            <header className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Текущая карточка</h2>
                <p className="text-xs text-slate-400">
                  {new Date(activeCard.createdAt).toLocaleString()}
                </p>
              </div>
              <CardCarousel cards={cards} activeCardId={activeCardId} onSelect={setActiveCard} />
            </header>
            <article className="prose prose-invert max-w-none rounded-3xl border border-white/5 bg-white/[0.04] p-6 text-sm shadow-inner shadow-black/20">
              <ReactMarkdown>{activeCard.content}</ReactMarkdown>
            </article>
          </section>
        )}
      </div>

      {showTranscriptPanel && (
        <aside className="fixed inset-0 z-40 flex items-center justify-end bg-black/40 backdrop-blur" onClick={() => setShowTranscriptPanel(false)}>
          <div className="h-full w-full max-w-md overflow-hidden border-l border-white/10 bg-canvas-surface/95 p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">История транскрипта</h2>
              <button className="text-sm text-slate-300 hover:text-white" onClick={() => setShowTranscriptPanel(false)}>
                Закрыть
              </button>
            </div>
            <TranscriptList fragments={transcripts} />
          </div>
        </aside>
      )}

      {showPromptEditor && (
        <aside className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur" onClick={() => setShowPromptEditor(false)}>
          <div
            className="w-full max-w-2xl rounded-3xl border border-white/10 bg-canvas-surface/90 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Системный промпт</h2>
              <button className="text-sm text-slate-300 hover:text-white" onClick={() => setShowPromptEditor(false)}>
                Закрыть
              </button>
            </header>
            <textarea
              value={promptDraft}
              onChange={(event) => setPromptDraft(event.target.value)}
              rows={10}
              className="w-full rounded-2xl border border-white/10 bg-canvas-background/80 p-4 text-sm text-white outline-none focus:border-canvas-accent"
            />
            <div className="mt-4 flex items-center justify-end gap-3">
              <ControlButton label="Отмена" onClick={() => setShowPromptEditor(false)} variant="ghost" />
              <ControlButton
                label={isSavingSystemPrompt ? "Сохранение..." : "Сохранить"}
                onClick={handleSavePrompt}
                disabled={isSavingSystemPrompt}
              />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
