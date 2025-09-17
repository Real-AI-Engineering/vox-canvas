import { useCallback } from "react";
import { Rnd } from "react-rnd";
import ReactMarkdown from "react-markdown";

import type { CardLayout, SessionCard } from "../types/session";

const DEFAULT_LAYOUT: CardLayout = {
  x: 80,
  y: 80,
  width: 320,
  height: 220,
};

interface StickyCardProps {
  card: SessionCard;
  onLayoutChange: (id: string, layout: CardLayout) => void;
}

export function StickyCard({ card, onLayoutChange }: StickyCardProps) {
  const layout = card.layout ?? DEFAULT_LAYOUT;

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
      minWidth={240}
      minHeight={180}
      style={{ zIndex: layout.zIndex ?? 1 }}
      className="group"
    >
      <article className="flex h-full w-full flex-col rounded-3xl bg-white/10 p-4 text-sm shadow-lg shadow-canvas-accent/30 backdrop-blur">
        <header className="flex items-center justify-between gap-2 pb-2">
          <h3 className="text-base font-semibold text-white/90">{card.title}</h3>
          <time className="text-xs text-slate-300">
            {new Date(card.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </time>
        </header>
        <div className="prose prose-invert max-w-none flex-1 overflow-auto text-sm">
          <ReactMarkdown>{card.content}</ReactMarkdown>
        </div>
      </article>
    </Rnd>
  );
}
