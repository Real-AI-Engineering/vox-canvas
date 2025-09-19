import type { SessionCard } from "../types/session";
import { DynamicCard } from "./DynamicCard";

interface StaticCardWrapperProps {
  card: SessionCard;
  onEdit: (card: SessionCard) => void;
  style?: React.CSSProperties;
  className?: string;
}

// A wrapper that renders cards in static mode by overriding Rnd styles
export function StaticCardWrapper({ card, onEdit, style, className }: StaticCardWrapperProps) {
  return (
    <div
      className={`${className || ""}`}
      style={style}
    >
      {/* Override Rnd positioning with CSS */}
      <style>
        {`
          .static-card-wrapper .react-draggable {
            position: static !important;
            transform: none !important;
          }
          .static-card-wrapper .react-resizable {
            position: static !important;
          }
          .static-card-wrapper .react-resizable-handle {
            display: none !important;
          }
        `}
      </style>
      <div className="static-card-wrapper w-full h-full">
        <DynamicCard
          card={card}
          onLayoutChange={() => {}} // Disable layout changes
          onEdit={onEdit}
        />
      </div>
    </div>
  );
}