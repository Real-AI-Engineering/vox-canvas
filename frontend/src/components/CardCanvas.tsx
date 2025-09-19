import { useMemo } from "react";
import type { SessionCard, CardLayout, DisplayMode } from "../types/session";
import { DynamicCard } from "./DynamicCard";
import { StaticCardWrapper } from "./StaticCardWrapper";

interface CardCanvasProps {
  cards: SessionCard[];
  displayMode: DisplayMode;
  activeCardId: string | null;
  onCardLayoutChange: (cardId: string, layout: CardLayout) => void;
  onCardEdit: (card: SessionCard) => void;
  onActiveCardChange: (cardId: string) => void;
}

export function CardCanvas({
  cards,
  displayMode,
  activeCardId,
  onCardLayoutChange,
  onCardEdit,
  onActiveCardChange,
}: CardCanvasProps) {
  const activeCard = useMemo(() =>
    cards.find(card => card.id === activeCardId) ?? cards[0],
    [cards, activeCardId]
  );

  const renderCanvas = () => {
    return (
      <div className="relative h-full w-full">
        {cards.map((card) => (
          <DynamicCard
            key={card.id}
            card={card}
            onLayoutChange={onCardLayoutChange}
            onEdit={onCardEdit}
          />
        ))}
      </div>
    );
  };

  const renderSingle = () => {
    if (!activeCard) return null;

    return (
      <div className="h-full w-full flex items-center justify-center p-8 overflow-hidden">
        <div className="w-full max-w-4xl h-full max-h-[600px]">
          <StaticCardWrapper
            card={activeCard}
            onEdit={onCardEdit}
            className="w-full h-full"
          />
        </div>
      </div>
    );
  };

  const renderGrid = () => {
    const columns = Math.min(Math.ceil(Math.sqrt(cards.length)), 4); // Max 4 columns
    const cardHeight = 300; // Fixed height for consistent grid

    return (
      <div className="p-6 h-full overflow-y-auto">
        <div
          className="grid gap-6 auto-rows-fr"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
          }}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              className="min-h-0" // Allow flex child to shrink
              style={{ height: cardHeight }}
            >
              <StaticCardWrapper
                card={card}
                onEdit={onCardEdit}
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFocus = () => {
    if (!activeCard) return null;

    const otherCards = cards.filter(card => card.id !== activeCard.id);
    const thumbnailHeight = 100;

    return (
      <div className="relative h-full w-full flex flex-col">
        {/* Main focused card */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-4xl h-full max-h-[500px]">
            <StaticCardWrapper
              card={activeCard}
              onEdit={onCardEdit}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Thumbnail cards */}
        {otherCards.length > 0 && (
          <div className="flex-shrink-0 p-4 border-t border-white/10">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {otherCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => onActiveCardChange(card.id)}
                  className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity rounded-xl overflow-hidden"
                  style={{ width: 150, height: thumbnailHeight }}
                >
                  <StaticCardWrapper
                    card={card}
                    onEdit={onCardEdit}
                    className="w-full h-full pointer-events-none"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCarousel = () => {
    if (!activeCard) return null;

    const currentIndex = cards.findIndex(card => card.id === activeCard.id);
    const nextCard = cards[(currentIndex + 1) % cards.length];
    const prevCard = cards[(currentIndex - 1 + cards.length) % cards.length];

    return (
      <div className="relative h-full w-full flex items-center justify-center">
        {/* Navigation buttons */}
        {cards.length > 1 && (
          <>
            <button
              onClick={() => onActiveCardChange(prevCard.id)}
              className="absolute left-6 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              ◀
            </button>
            <button
              onClick={() => onActiveCardChange(nextCard.id)}
              className="absolute right-6 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              ▶
            </button>
          </>
        )}

        {/* Current card */}
        <div className="w-full max-w-4xl h-full max-h-[600px] px-20 py-8">
          <StaticCardWrapper
            card={activeCard}
            onEdit={onCardEdit}
            className="w-full h-full"
          />
        </div>

        {/* Card indicator */}
        {cards.length > 1 && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => onActiveCardChange(card.id)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  card.id === activeCard.id ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  switch (displayMode) {
    case "single":
      return renderSingle();
    case "grid":
      return renderGrid();
    case "focus":
      return renderFocus();
    case "carousel":
      return renderCarousel();
    case "canvas":
    default:
      return renderCanvas();
  }
}