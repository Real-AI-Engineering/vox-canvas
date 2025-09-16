import type { SessionCard } from "../types/session";

interface CardCarouselProps {
  cards: SessionCard[];
  activeCardId: string | null;
  onSelect: (id: string) => void;
}

export function CardCarousel({ cards, activeCardId, onSelect }: CardCarouselProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {cards.map((card) => (
        <button
          key={card.id}
          onClick={() => onSelect(card.id)}
          className={`group min-w-[180px] rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left transition hover:border-canvas-accent/60 hover:bg-white/[0.05] ${
            card.id === activeCardId ? "border-canvas-accent bg-white/[0.08]" : ""
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {new Date(card.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="mt-2 line-clamp-3 text-sm font-semibold text-white/90 group-hover:text-white">
            {card.title}
          </p>
        </button>
      ))}
    </div>
  );
}
