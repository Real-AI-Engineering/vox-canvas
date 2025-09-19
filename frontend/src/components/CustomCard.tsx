import { useCallback, useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import ReactMarkdown from "react-markdown";
import type { CardLayout, SessionCard } from "../types/session";

const DEFAULT_LAYOUT: CardLayout = {
  x: 80,
  y: 80,
  width: 350,
  height: 250,
};

interface CustomCardProps {
  card: SessionCard;
  onLayoutChange: (id: string, layout: CardLayout) => void;
  onEdit: (card: SessionCard) => void;
}

export function CustomCard({ card, onLayoutChange, onEdit }: CustomCardProps) {
  const layout = card.layout ?? DEFAULT_LAYOUT;
  const [content, setContent] = useState<string>(card.content || "");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  useEffect(() => {
    setContent(card.content || "");
    setEditContent(card.content || "");
  }, [card.content]);

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

  const handleSaveEdit = () => {
    setContent(editContent);
    setIsEditing(false);
    // TODO: API call to update card content
  };

  const handleCancelEdit = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  const getCardTheme = () => {
    // Can add different themes based on content or metadata
    const themes = [
      "from-purple-500/20 to-purple-600/10 shadow-purple-500/20",
      "from-indigo-500/20 to-indigo-600/10 shadow-indigo-500/20",
      "from-pink-500/20 to-pink-600/10 shadow-pink-500/20",
      "from-orange-500/20 to-orange-600/10 shadow-orange-500/20",
    ];
    const themeIndex = card.id.charCodeAt(0) % themes.length;
    return themes[themeIndex];
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
      minHeight={150}
      style={{ zIndex: layout.zIndex ?? 1 }}
      className="group"
    >
      <article className={`flex h-full w-full flex-col rounded-3xl bg-gradient-to-br ${getCardTheme()} p-4 shadow-lg backdrop-blur`}>
        <header className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="text-lg">🎨</div>
            <h3 className="text-sm font-medium text-white/80">{card.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="text-xs text-green-400 hover:text-green-300"
                  title="Save"
                >
                  ✅
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-xs text-red-400 hover:text-red-300"
                  title="Cancel"
                >
                  ❌
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white/60 hover:text-white"
                  title="Edit content"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onEdit(card)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white/60 hover:text-white"
                  title="Card settings"
                >
                  ⚙️
                </button>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto mt-3">
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm text-white placeholder-white/50 resize-none focus:outline-none focus:border-white/40"
              placeholder="Enter card content..."
              autoFocus
            />
          ) : (
            <div className="prose prose-invert prose-sm max-w-none text-white/90">
              {content ? (
                <ReactMarkdown>{content}</ReactMarkdown>
              ) : (
                <div className="flex items-center justify-center h-full text-white/50 text-sm">
                  <div className="text-center">
                    <div className="text-2xl mb-2">📝</div>
                    <div>Click ✏️ to edit</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between text-xs text-white/40 pt-2 border-t border-white/5">
          <span>Custom Card</span>
          <span>
            {card.updatedAt
              ? `Updated: ${new Date(card.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : `Created: ${new Date(card.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            }
          </span>
        </footer>
      </article>
    </Rnd>
  );
}