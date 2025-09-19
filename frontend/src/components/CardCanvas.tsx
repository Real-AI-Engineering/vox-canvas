import { useMemo } from "react";
import type { SessionCard, CardLayout, DisplayMode } from "../types/session";
import { DynamicCard } from "./DynamicCard";

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

    const singleCardLayout: CardLayout = {
      x: 20,
      y: 20,
      width: Math.max(600, window.innerWidth - 100),
      height: Math.max(400, window.innerHeight - 200),
      zIndex: 1,
    };

    return (
      <div className="relative h-full w-full flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <DynamicCard
            card={{ ...activeCard, layout: singleCardLayout }}
            onLayoutChange={onCardLayoutChange}
            onEdit={onCardEdit}
          />
        </div>
      </div>
    );
  };

  const renderGrid = () => {
    const columns = Math.ceil(Math.sqrt(cards.length));
    const cardWidth = Math.max(280, (window.innerWidth - 100) / columns - 20);
    const cardHeight = Math.max(200, cardWidth * 0.7);

    return (
      <div className="p-4 h-full overflow-y-auto">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(${cardWidth}px, 1fr))`,
          }}
        >
          {cards.map((card) => {
            const gridLayout: CardLayout = {
              x: 0,
              y: 0,
              width: cardWidth,
              height: cardHeight,
              zIndex: 1,
            };

            return (
              <div
                key={card.id}
                className="relative"
                style={{ width: cardWidth, height: cardHeight }}
              >
                <DynamicCard
                  card={{ ...card, layout: gridLayout }}
                  onLayoutChange={onCardLayoutChange}
                  onEdit={onCardEdit}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFocus = () => {
    if (!activeCard) return null;

    const focusLayout: CardLayout = {
      x: 20,
      y: 20,
      width: Math.max(500, window.innerWidth * 0.6),
      height: Math.max(350, window.innerHeight * 0.6),
      zIndex: 2,
    };

    const thumbnailSize = 120;
    const otherCards = cards.filter(card => card.id !== activeCard.id);

    return (
      <div className="relative h-full w-full">
        {/* Main focused card */}
        <div className="absolute inset-4 flex items-center justify-center">
          <DynamicCard
            card={{ ...activeCard, layout: focusLayout }}
            onLayoutChange={onCardLayoutChange}
            onEdit={onCardEdit}
          />
        </div>

        {/* Thumbnail cards */}
        <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto pb-2">
          {otherCards.map((card) => {
            const thumbnailLayout: CardLayout = {
              x: 0,
              y: 0,
              width: thumbnailSize,
              height: thumbnailSize * 0.7,
              zIndex: 1,
            };

            return (
              <button
                key={card.id}
                onClick={() => onActiveCardChange(card.id)}
                className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                style={{ width: thumbnailSize, height: thumbnailSize * 0.7 }}
              >
                <DynamicCard
                  card={{ ...card, layout: thumbnailLayout }}
                  onLayoutChange={() => {}} // Disable layout changes for thumbnails
                  onEdit={onCardEdit}
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCarousel = () => {
    if (!activeCard) return null;

    const carouselLayout: CardLayout = {
      x: 20,
      y: 20,
      width: Math.max(500, window.innerWidth - 100),
      height: Math.max(400, window.innerHeight - 150),
      zIndex: 1,
    };

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
              className="absolute left-4 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              ◀
            </button>
            <button
              onClick={() => onActiveCardChange(nextCard.id)}
              className="absolute right-4 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              ▶
            </button>
          </>
        )}

        {/* Current card */}
        <div className="w-full max-w-4xl px-16">
          <DynamicCard
            card={{ ...activeCard, layout: carouselLayout }}
            onLayoutChange={onCardLayoutChange}
            onEdit={onCardEdit}
          />
        </div>

        {/* Card indicator */}
        {cards.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => onActiveCardChange(card.id)}
                className={`w-2 h-2 rounded-full transition-colors ${
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