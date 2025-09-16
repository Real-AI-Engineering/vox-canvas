import { useState, useEffect, useMemo, useRef } from "react";
import { TranscriptionWebSocket } from "./services/websocket";
import { AudioRecorder } from "./services/audioRecorder";

// Demo data inline
const demoTranscripts = [
  {
    id: "demo-t-1",
    time: "10:05",
    text: "Сегодня разберём архитектуру AI Workshop Assistant и синхронизацию между фронтендом и бэкендом.",
    speaker: "Ведущий",
  },
  {
    id: "demo-t-2",
    time: "10:07",
    text: "Карточки генерируются по запросу, поэтому нам нужен быстрый отклик от OpenAI и локальное кеширование.",
    speaker: "Ведущий",
  },
  {
    id: "demo-t-3",
    time: "10:09",
    text: "Участники смогут видеть новую карточку на проекторе и возвращаться к истории через боковую панель.",
    speaker: "Ведущий",
  },
];

const demoCards = [
  {
    id: "demo-c-1",
    title: "Архитектура воркшопа",
    content: `# Архитектура воркшопа\n- Фронтенд на React отображает карточки и транскрипт.\n- WebSocket поток обрабатывает аудио и обновления.\n- FastAPI координирует STT и генерацию контента.`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-c-2",
    title: "Задачи MVP",
    content: `# Задачи MVP\n- Реальное время: минимальная задержка между речью и текстом.\n- Контроль сессии: старт/стоп записи, экспорт JSON.\n- Визуализация: крупные карточки + навигация для аудитории.`,
    createdAt: new Date().toISOString(),
  },
];

// Components inline
function SessionStatus({ state }: { state: string }) {
  const statusConfig = {
    idle: { icon: "⏸", label: "Ожидание", color: "bg-slate-500" },
    listening: { icon: "🎙", label: "Запись", color: "bg-green-500" },
    paused: { icon: "⏸", label: "Пауза", color: "bg-yellow-500" },
  };

  const config = statusConfig[state as keyof typeof statusConfig] || statusConfig.idle;

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${config.color} animate-pulse`}></div>
      <p className="text-sm font-medium">{config.label}</p>
    </div>
  );
}

function ConnectionBadge({ status }: { status: string }) {
  const statusConfig = {
    connected: { label: "Online", color: "bg-green-500" },
    connecting: { label: "Connecting", color: "bg-yellow-500" },
    disconnected: { label: "Offline", color: "bg-red-500" },
    error: { label: "Error", color: "bg-red-600" },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.disconnected;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1">
      <div className={`h-1.5 w-1.5 rounded-full ${config.color}`}></div>
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="mb-2 text-lg font-medium text-slate-300">{title}</p>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}

function TranscriptList({ fragments }: { fragments: any[] }) {
  if (fragments.length === 0) return null;

  return (
    <div className="flex-1 space-y-4 overflow-y-auto pr-2">
      {fragments.map((fragment) => (
        <article
          key={fragment.id}
          className="rounded-2xl border border-white/5 bg-white/[0.04] p-4 shadow-inner shadow-black/20"
        >
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
            {fragment.speaker && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                {fragment.speaker}
              </span>
            )}
            <span>{fragment.time}</span>
            {fragment.confidence && (
              <span className="text-[10px] text-slate-500">
                {Math.round(fragment.confidence * 100)}%
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-slate-100">{fragment.text}</p>
        </article>
      ))}
    </div>
  );
}

function CardCarousel({ cards, activeCardId, onSelect }: { cards: any[]; activeCardId: string | null; onSelect: (id: string) => void }) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {cards.map((card) => (
        <button
          key={card.id}
          onClick={() => onSelect(card.id)}
          className={`flex-shrink-0 rounded-xl p-3 text-left transition-all ${
            card.id === activeCardId
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          <p className="text-xs font-medium">{card.title}</p>
        </button>
      ))}
    </div>
  );
}

function ReconnectionBanner({ status, onReconnect }: { status: string; onReconnect: () => void }) {
  if (status !== "disconnected" && status !== "error") return null;

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg bg-red-900/50 p-3 text-sm">
      <span>Соединение потеряно</span>
      <button
        onClick={onReconnect}
        className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
      >
        Переподключить
      </button>
    </div>
  );
}

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
      ? "bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-600"
      : "bg-transparent text-slate-300 hover:text-white hover:bg-white/5 focus-visible:outline-white";

  return (
    <button className={`${base} ${styles}`} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

export default function App() {
  const [sessionState, setSessionState] = useState("idle");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [cards, setCards] = useState(demoCards);
  const [activeCardId, setActiveCardId] = useState(demoCards[0]?.id || null);
  const [isFetching, setIsFetching] = useState(false);

  const wsRef = useRef<TranscriptionWebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  useEffect(() => {
    console.log("App mounted, initializing services...");

    // Initialize WebSocket
    wsRef.current = new TranscriptionWebSocket();

    // Set up WebSocket callbacks
    wsRef.current.onStatusChange((status) => {
      console.log("WebSocket status:", status);
      setConnectionStatus(status);
    });

    wsRef.current.onMessage((data) => {
      console.log("Received transcription:", data);

      if (data.type === 'transcription') {
        // Only add final transcripts to the list, not partial ones
        if (data.is_final) {
          const newFragment = {
            id: `t-${Date.now()}`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: data.text,
            speaker: data.speaker || "Ведущий",
            confidence: data.confidence
          };
          setTranscripts(prev => [...prev, newFragment]);
        }
      } else if (data.type === 'card') {
        const newCard = {
          id: data.id || `card-${Date.now()}`,
          title: data.title,
          content: data.content,
          createdAt: new Date().toISOString(),
        };
        setCards(prev => [...prev, newCard]);
        setActiveCardId(newCard.id);
      }
    });

    // Connect WebSocket
    wsRef.current.connect();

    // Initialize audio recorder
    audioRecorderRef.current = new AudioRecorder();

    audioRecorderRef.current.onData((audioData) => {
      if (wsRef.current) {
        // Send PCM audio data directly via WebSocket
        wsRef.current.sendAudioData(audioData);
      }
    });

    // Cleanup
    return () => {
      console.log("Cleaning up services...");
      if (audioRecorderRef.current) {
        audioRecorderRef.current.cleanup();
      }
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, []);

  const activeCard = useMemo(() => {
    if (!cards || cards.length === 0) return null;
    return cards.find((card) => card.id === activeCardId) ?? null;
  }, [cards, activeCardId]);

  const handleReconnect = () => {
    console.log("Reconnecting WebSocket...");
    if (wsRef.current) {
      wsRef.current.connect();
    }
  };

  const toggleSession = async () => {
    if (sessionState === "idle") {
      // Start recording
      if (audioRecorderRef.current) {
        const started = await audioRecorderRef.current.startRecording();
        if (started) {
          setSessionState("listening");
          // Don't send start_session - just start sending audio
        }
      }
    } else {
      // Stop recording
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stopRecording();
        setSessionState("idle");
        // Don't send stop_session - keep WebSocket alive
        // Just stop sending audio data
      }
    }
  };

  const clearTranscript = () => {
    setTranscripts([]);
  };

  const createCardFromContext = async () => {
    setIsFetching(true);

    // Send request to backend to create card
    if (wsRef.current) {
      wsRef.current.sendMessage({
        type: 'create_card',
        context: transcripts.map(t => t.text).join(' ')
      });
    }

    // For demo, create a local card
    setTimeout(() => {
      const newCard = {
        id: `card-${Date.now()}`,
        title: "Новая карточка",
        content: "# Сгенерированная карточка\nОжидание контента от API...",
        createdAt: new Date().toISOString(),
      };
      setCards(prev => [...prev, newCard]);
      setActiveCardId(newCard.id);
      setIsFetching(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Toast placeholder */}
      <div className="fixed bottom-4 right-4 z-50"></div>

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-800/70 p-6 backdrop-blur-lg shadow-xl">
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
              <ControlButton
                label="Очистить транскрипт"
                onClick={clearTranscript}
                variant="ghost"
              />
              <ControlButton
                label="Новая карточка"
                onClick={createCardFromContext}
                variant="ghost"
                disabled={isFetching || transcripts.length === 0}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Карточек</p>
              <p className="text-2xl font-semibold">{cards?.length || 0}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Фрагментов речи</p>
              <p className="text-2xl font-semibold">{transcripts?.length || 0}</p>
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
          <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-800/70 p-6 backdrop-blur-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Транскрипт</h2>
              <span className={`rounded-full border border-white/10 px-3 py-1 text-xs ${
                sessionState === 'listening'
                  ? 'bg-green-500/20 text-green-300 border-green-500/50'
                  : 'bg-white/10 text-slate-200'
              }`}>
                {sessionState === 'listening' ? '🔴 Live' : 'Offline'}
              </span>
            </div>
            {!transcripts || transcripts.length === 0 ? (
              <EmptyState
                title="Транскрипт пуст"
                description="Нажмите 'Начать запись' чтобы начать транскрибацию голоса в реальном времени."
              />
            ) : (
              <TranscriptList fragments={transcripts} />
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-800/70 p-6 backdrop-blur-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Карточки</h2>
              <span className="text-xs text-slate-400">
                {activeCard
                  ? `Последняя: ${new Date(activeCard.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Нет карточек"}
              </span>
            </div>
            {activeCard ? (
              <div className="flex h-full flex-col gap-4">
                <article className="prose prose-invert max-w-none flex-1 rounded-3xl border border-white/5 bg-white/[0.06] p-6 text-sm shadow-lg shadow-blue-500/20">
                  <div className="whitespace-pre-wrap">{activeCard.content}</div>
                </article>
                {cards && cards.length > 0 && (
                  <CardCarousel
                    cards={cards}
                    activeCardId={activeCardId}
                    onSelect={setActiveCardId}
                  />
                )}
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