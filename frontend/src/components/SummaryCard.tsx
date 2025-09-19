import { useCallback, useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import ReactMarkdown from "react-markdown";
import type { CardLayout, SessionCard } from "../types/session";
import { useSessionStore } from "../state/sessionStore";

const DEFAULT_LAYOUT: CardLayout = {
  x: 80,
  y: 80,
  width: 400,
  height: 300,
};

interface SummaryCardProps {
  card: SessionCard;
  onLayoutChange: (id: string, layout: CardLayout) => void;
  onEdit: (card: SessionCard) => void;
}

export function SummaryCard({ card, onLayoutChange, onEdit }: SummaryCardProps) {
  const layout = card.layout ?? DEFAULT_LAYOUT;
  const transcripts = useSessionStore((state) => state.transcripts);

  // Extract actual content from markdown, removing stub text
  const getCleanContent = (content: string) => {
    if (!content) return "Waiting for content...";

    // If it's stub content, show waiting message
    if (content.includes("_Stub_: OpenAI connection will be added")) {
      return "OpenAI/Gemini not configured. Please add API keys.";
    }

    // Remove the title line and request line from markdown
    const lines = content.split('\n');
    const cleanLines = lines.filter(line =>
      !line.startsWith('# ') &&
      !line.startsWith('- Request:') &&
      !line.includes('_Stub_:') &&
      line.trim() !== ''
    );

    return cleanLines.join('\n').trim() || "No content available";
  };

  const [summary, setSummary] = useState<string>(getCleanContent(card.content || ""));
  const [isUpdating, setIsUpdating] = useState(false);

  // Update summary when card content changes
  useEffect(() => {
    setSummary(getCleanContent(card.content || ""));
  }, [card.content]);

  useEffect(() => {
    if (card.autoUpdate && transcripts.length > 0) {
      updateSummary();
    }
  }, [transcripts, card.autoUpdate]);

  const updateSummary = useCallback(async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      // Get recent transcript text for summary
      const recentTranscripts = transcripts.slice(-10);
      const transcriptText = recentTranscripts
        .map(t => t.text)
        .join(' ');

      if (transcriptText.trim()) {
        // Create summary prompt
        const summaryPrompt = card.prompt ||
          "Создай краткое саммари последних высказываний из транскрипта. Выдели основные темы и ключевые моменты.";

        const response = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: summaryPrompt,
            context: transcriptText,
            type: 'summary'
          })
        });

        if (response.ok) {
          const result = await response.json();
          const newContent = result.contentMarkdown || result.content || "";
          setSummary(getCleanContent(newContent));
        }
      }
    } catch (error) {
      console.error('Failed to update summary:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [transcripts, card.prompt, isUpdating]);

  const handleChange = useCallback(
    (next: Partial<CardLayout>) => {
      const updated: CardLayout = {
        x: next.x ?? layout.x,
        y: next.y ?? layout.y,
        width: next.width ?? layout.width,
        height: next.height ?? layout.height,
        rotation: next.rotation ?? layout.rotation ?? null,
        zIndex: next.zIndex ?? layout.zIndex ?? null,
      };
      onLayoutChange(card.id, updated);
    },
    [card.id, layout, onLayoutChange],
  );

  return (
    <Rnd
      size={{ width: layout.width, height: layout.height }}
      position={{ x: layout.x, y: layout.y }}
      onDragStop={(_, data) => handleChange({ x: data.x, y: data.y })}
      onResizeStop={(_, __, ref, ___, position) =>
        handleChange({
          width: ref.offsetWidth,
          height: ref.offsetHeight,
          x: position.x,
          y: position.y,
        })
      }
      bounds="parent"
      minWidth={300}
      minHeight={200}
      style={{ zIndex: layout.zIndex ?? 1 }}
      className="group"
    >
      <article className="flex h-full w-full flex-col rounded-3xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-4 shadow-lg shadow-blue-500/20 backdrop-blur">
        <header className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="text-lg">📄</div>
            <h3 className="text-sm font-medium text-white/80">{card.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={updateSummary}
              disabled={isUpdating}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white/60 hover:text-white disabled:opacity-50"
              title="Обновить саммари"
            >
              {isUpdating ? "⏳" : "🔄"}
            </button>
            <button
              onClick={() => onEdit(card)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white/60 hover:text-white"
            >
              ✏️
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto mt-3">
          <div className="prose prose-invert prose-sm max-w-none text-white/90">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        </div>

        <footer className="flex items-center justify-between text-xs text-white/40 pt-2 border-t border-white/5">
          <span>Summary</span>
          <span>Updated: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </footer>
      </article>
    </Rnd>
  );
}