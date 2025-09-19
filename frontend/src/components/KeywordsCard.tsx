import { useCallback, useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import type { CardLayout, SessionCard } from "../types/session";
import { useSessionStore } from "../state/sessionStore";

const DEFAULT_LAYOUT: CardLayout = {
  x: 80,
  y: 80,
  width: 300,
  height: 250,
};

interface KeywordsCardProps {
  card: SessionCard;
  onLayoutChange: (id: string, layout: CardLayout) => void;
  onEdit: (card: SessionCard) => void;
}

interface Keyword {
  word: string;
  count: number;
  relevance: number;
}

export function KeywordsCard({ card, onLayoutChange, onEdit }: KeywordsCardProps) {
  const layout = card.layout ?? DEFAULT_LAYOUT;
  const transcripts = useSessionStore((state) => state.transcripts);

  // Extract keywords from content, handling stub content
  const parseKeywords = (content: string): Keyword[] => {
    if (!content) return [];

    // If it's stub content, return empty array
    if (content.includes("_Stub_: OpenAI connection will be added")) {
      return [];
    }

    // Simple keyword extraction from markdown
    const lines = content.split('\n');
    const keywordLines = lines.filter(line =>
      line.trim() &&
      !line.startsWith('# ') &&
      !line.startsWith('- Request:') &&
      !line.includes('_Stub_:')
    );

    return keywordLines.map((line, index) => ({
      word: line.replace(/[#*-]/g, '').trim(),
      count: Math.floor(Math.random() * 10) + 1,
      relevance: 0.9 - (index * 0.1)
    })).slice(0, 10);
  };

  const [keywords, setKeywords] = useState<Keyword[]>(parseKeywords(card.content || ""));
  const [isUpdating, setIsUpdating] = useState(false);

  // Update keywords when card content changes
  useEffect(() => {
    setKeywords(parseKeywords(card.content || ""));
  }, [card.content]);

  useEffect(() => {
    if (card.autoUpdate && transcripts.length > 0) {
      updateKeywords();
    }
  }, [transcripts, card.autoUpdate]);

  const updateKeywords = useCallback(async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      // Get all transcript text
      const transcriptText = transcripts
        .map(t => t.text)
        .join(' ')
        .toLowerCase();

      if (transcriptText.trim()) {
        // Simple keyword extraction (можно улучшить с помощью API)
        const words = transcriptText
          .match(/[а-яёa-z]+/g) || [];

        // Filter out common words
        const stopWords = new Set([
          'и', 'в', 'на', 'с', 'по', 'для', 'как', 'что', 'это', 'не', 'то', 'да', 'но', 'или',
          'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in',
          'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with'
        ]);

        const wordCounts = new Map<string, number>();
        words
          .filter(word => word.length > 2 && !stopWords.has(word))
          .forEach(word => {
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
          });

        // Convert to keywords array and sort by count
        const keywordsList = Array.from(wordCounts.entries())
          .map(([word, count]) => ({
            word,
            count,
            relevance: count / words.length * 100
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10); // Top 10 keywords

        setKeywords(keywordsList);
      }
    } catch (error) {
      console.error('Failed to update keywords:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [transcripts, isUpdating]);

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

  const getKeywordSize = (relevance: number) => {
    if (relevance > 0.5) return "text-lg font-bold";
    if (relevance > 0.3) return "text-base font-semibold";
    return "text-sm";
  };

  const getKeywordColor = (count: number, maxCount: number) => {
    const intensity = count / maxCount;
    if (intensity > 0.7) return "text-yellow-300";
    if (intensity > 0.5) return "text-blue-300";
    if (intensity > 0.3) return "text-green-300";
    return "text-white/70";
  };

  const maxCount = Math.max(...keywords.map(k => k.count), 1);

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
      minWidth={250}
      minHeight={200}
      style={{ zIndex: layout.zIndex ?? 1 }}
      className="group"
    >
      <article className="flex h-full w-full flex-col rounded-3xl bg-gradient-to-br from-green-500/20 to-green-600/10 p-4 shadow-lg shadow-green-500/20 backdrop-blur">
        <header className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="text-lg">🏷️</div>
            <h3 className="text-sm font-medium text-white/80">{card.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={updateKeywords}
              disabled={isUpdating}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white/60 hover:text-white disabled:opacity-50"
              title="Обновить ключевые слова"
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
          {keywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className={`px-2 py-1 rounded-full bg-white/10 border border-white/20 ${getKeywordSize(keyword.relevance)} ${getKeywordColor(keyword.count, maxCount)} transition-colors hover:bg-white/20`}
                  title={`${keyword.count} упоминаний`}
                >
                  {keyword.word}
                  <span className="ml-1 text-xs opacity-60">
                    {keyword.count}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-white/50 text-sm">
              {card.content?.includes("_Stub_: OpenAI connection will be added")
                ? "OpenAI/Gemini not configured"
                : "No keywords available"}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between text-xs text-white/40 pt-2 border-t border-white/5">
          <span>Keywords</span>
          <span>Found: {keywords.length}</span>
        </footer>
      </article>
    </Rnd>
  );
}