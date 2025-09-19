import { useCallback, useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import type { CardLayout, SessionCard } from "../types/session";
import { useSessionStore } from "../state/sessionStore";

const DEFAULT_LAYOUT: CardLayout = {
  x: 80,
  y: 80,
  width: 280,
  height: 200,
};

interface SentimentCardProps {
  card: SessionCard;
  onLayoutChange: (id: string, layout: CardLayout) => void;
  onEdit: (card: SessionCard) => void;
}

interface SentimentData {
  overall: "positive" | "negative" | "neutral";
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  emotions: {
    joy: number;
    anger: number;
    sadness: number;
    fear: number;
    surprise: number;
  };
}

export function SentimentCard({ card, onLayoutChange, onEdit }: SentimentCardProps) {
  const layout = card.layout ?? DEFAULT_LAYOUT;
  const transcripts = useSessionStore((state) => state.transcripts);
  const [sentiment, setSentiment] = useState<SentimentData>({
    overall: "neutral",
    score: 0,
    confidence: 0,
    emotions: { joy: 0, anger: 0, sadness: 0, fear: 0, surprise: 0 }
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (card.autoUpdate && transcripts.length > 0) {
      updateSentiment();
    }
  }, [transcripts, card.autoUpdate]);

  const updateSentiment = useCallback(async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      // Get recent transcript text
      const recentText = transcripts
        .slice(-5)
        .map(t => t.text)
        .join(' ');

      if (recentText.trim()) {
        // Simple sentiment analysis (базовый анализ, можно улучшить с помощью API)
        const positiveWords = [
          'хорошо', 'отлично', 'замечательно', 'прекрасно', 'удивительно', 'великолепно',
          'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love'
        ];
        const negativeWords = [
          'плохо', 'ужасно', 'отвратительно', 'грустно', 'злой', 'проблема',
          'bad', 'terrible', 'awful', 'sad', 'angry', 'hate', 'problem', 'issue'
        ];

        const words = recentText.toLowerCase().split(/\s+/);
        let positiveScore = 0;
        let negativeScore = 0;

        words.forEach(word => {
          if (positiveWords.some(pw => word.includes(pw))) {
            positiveScore++;
          }
          if (negativeWords.some(nw => word.includes(nw))) {
            negativeScore++;
          }
        });

        const totalScore = positiveScore - negativeScore;
        const maxPossible = words.length;
        const normalizedScore = maxPossible > 0 ? Math.max(-1, Math.min(1, totalScore / maxPossible * 10)) : 0;

        let overall: "positive" | "negative" | "neutral" = "neutral";
        if (normalizedScore > 0.1) overall = "positive";
        else if (normalizedScore < -0.1) overall = "negative";

        setSentiment({
          overall,
          score: normalizedScore,
          confidence: Math.min(0.9, Math.abs(normalizedScore) + 0.3),
          emotions: {
            joy: overall === "positive" ? Math.random() * 0.8 + 0.2 : Math.random() * 0.3,
            anger: overall === "negative" ? Math.random() * 0.8 + 0.2 : Math.random() * 0.2,
            sadness: overall === "negative" ? Math.random() * 0.6 + 0.1 : Math.random() * 0.2,
            fear: Math.random() * 0.3,
            surprise: Math.random() * 0.4,
          }
        });
      }
    } catch (error) {
      console.error('Failed to update sentiment:', error);
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

  const getSentimentColor = () => {
    switch (sentiment.overall) {
      case "positive":
        return "from-green-500/20 to-green-600/10 shadow-green-500/20";
      case "negative":
        return "from-red-500/20 to-red-600/10 shadow-red-500/20";
      default:
        return "from-gray-500/20 to-gray-600/10 shadow-gray-500/20";
    }
  };

  const getSentimentEmoji = () => {
    switch (sentiment.overall) {
      case "positive":
        return "😊";
      case "negative":
        return "😔";
      default:
        return "😐";
    }
  };

  const getScoreColor = () => {
    if (sentiment.score > 0.1) return "text-green-400";
    if (sentiment.score < -0.1) return "text-red-400";
    return "text-gray-400";
  };

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
      minHeight={180}
      style={{ zIndex: layout.zIndex ?? 1 }}
      className="group"
    >
      <article className={`flex h-full w-full flex-col rounded-3xl bg-gradient-to-br ${getSentimentColor()} p-4 shadow-lg backdrop-blur`}>
        <header className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="text-lg">💭</div>
            <h3 className="text-sm font-medium text-white/80">{card.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={updateSentiment}
              disabled={isUpdating}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white/60 hover:text-white disabled:opacity-50"
              title="Обновить анализ тональности"
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

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">{getSentimentEmoji()}</div>
            <div className={`text-2xl font-bold mb-1 ${getScoreColor()}`}>
              {sentiment.overall.toUpperCase()}
            </div>
            <div className="text-sm text-white/70 mb-2">
              Score: {(sentiment.score * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-white/50">
              Confidence: {(sentiment.confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        <footer className="text-xs text-white/40 pt-2 border-t border-white/5">
          <div className="flex justify-between items-center">
            <span>Sentiment Analysis</span>
            <span>Updated: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </footer>
      </article>
    </Rnd>
  );
}