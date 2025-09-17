import type { SessionCard, CardLayout } from "../types/session";
import { StickyCard } from "./StickyCard";
import { CounterCard } from "./CounterCard";

interface DynamicCardProps {
  card: SessionCard;
  onLayoutChange: (id: string, layout: CardLayout) => void;
  onEdit: (card: SessionCard) => void;
}

export function DynamicCard({ card, onLayoutChange, onEdit }: DynamicCardProps) {
  switch (card.type) {
    case "counter":
      return <CounterCard card={card} onLayoutChange={onLayoutChange} onEdit={onEdit} />;
    case "static":
    case "list":
    case "chart":
    default:
      return <StickyCard card={card} onLayoutChange={onLayoutChange} onEdit={onEdit} />;
  }
}