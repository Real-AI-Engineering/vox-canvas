import type { SessionCard, CardLayout } from "../types/session";
import { StickyCard } from "./StickyCard";
import { CounterCard } from "./CounterCard";
import { SummaryCard } from "./SummaryCard";
import { KeywordsCard } from "./KeywordsCard";
import { SentimentCard } from "./SentimentCard";
import { CustomCard } from "./CustomCard";

interface DynamicCardProps {
  card: SessionCard;
  onLayoutChange: (id: string, layout: CardLayout) => void;
  onEdit: (card: SessionCard) => void;
}

export function DynamicCard({ card, onLayoutChange, onEdit }: DynamicCardProps) {
  switch (card.type) {
    case "counter":
      return <CounterCard card={card} onLayoutChange={onLayoutChange} onEdit={onEdit} />;
    case "summary":
      return <SummaryCard card={card} onLayoutChange={onLayoutChange} onEdit={onEdit} />;
    case "keywords":
      return <KeywordsCard card={card} onLayoutChange={onLayoutChange} onEdit={onEdit} />;
    case "sentiment":
      return <SentimentCard card={card} onLayoutChange={onLayoutChange} onEdit={onEdit} />;
    case "custom":
      return <CustomCard card={card} onLayoutChange={onLayoutChange} onEdit={onEdit} />;
    case "static":
    case "list":
    case "chart":
    default:
      return <StickyCard card={card} onLayoutChange={onLayoutChange} onEdit={onEdit} />;
  }
}