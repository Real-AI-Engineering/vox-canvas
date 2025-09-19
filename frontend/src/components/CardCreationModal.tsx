import { useState } from "react";
import type { CardType } from "../types/session";

interface CardCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCard: (prompt: string, cardType: CardType) => Promise<void>;
  isLoading?: boolean;
}

const CARD_TEMPLATES = [
  {
    type: "counter" as CardType,
    title: "Word Counter",
    description: "Counts specific words in the transcript",
    example: "Create a word counter for 'house' and display count from transcript",
  },
  {
    type: "static" as CardType,
    title: "Regular Card",
    description: "Static card with text and formatting",
    example: "Create a card with key points from the recent discussion",
  },
  {
    type: "list" as CardType,
    title: "Task List",
    description: "Dynamic list of items",
    example: "Create a list of mentioned tasks from the transcript",
  },
  {
    type: "chart" as CardType,
    title: "Chart",
    description: "Data visualization from transcript",
    example: "Create a chart of keyword mention frequency",
  },
];

export function CardCreationModal({ isOpen, onClose, onCreateCard, isLoading }: CardCreationModalProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedType, setSelectedType] = useState<CardType>("static");
  const [showTemplates, setShowTemplates] = useState(true);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!prompt.trim()) return;
    await onCreateCard(prompt, selectedType);
    setPrompt("");
    setShowTemplates(true);
    onClose();
  };

  const handleSelectTemplate = (template: typeof CARD_TEMPLATES[0]) => {
    setSelectedType(template.type);
    setPrompt(template.example);
    setShowTemplates(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-3xl border border-white/10 bg-canvas-surface/95 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create New Card</h2>
          <button
            onClick={onClose}
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            Close
          </button>
        </header>

        {showTemplates ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Choose a card type or enter your own prompt</p>
            <div className="grid gap-4 md:grid-cols-2">
              {CARD_TEMPLATES.map((template) => (
                <button
                  key={template.type}
                  onClick={() => handleSelectTemplate(template)}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-canvas-accent hover:bg-white/10"
                >
                  <h3 className="mb-1 font-medium">{template.title}</h3>
                  <p className="mb-2 text-xs text-slate-400">{template.description}</p>
                  <p className="text-xs text-canvas-accent">Example: {template.example}</p>
                </button>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-center">
              <button
                onClick={() => setShowTemplates(false)}
                className="text-sm text-slate-300 hover:text-white"
              >
                Or enter your own prompt →
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Card Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as CardType)}
                className="w-full rounded-xl border border-white/10 bg-canvas-background/60 px-3 py-2 text-sm text-white outline-none focus:border-canvas-accent"
              >
                <option value="static">Regular Card</option>
                <option value="counter">Counter</option>
                <option value="list">List</option>
                <option value="chart">Chart</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Describe what the card should display
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: Create a word counter for 'car' and update it when it appears in the transcript"
                className="min-h-[120px] w-full resize-y rounded-xl border border-white/10 bg-canvas-background/60 p-3 text-sm text-white outline-none focus:border-canvas-accent"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setShowTemplates(true)}
                className="text-sm text-slate-300 hover:text-white"
              >
                ← Back to templates
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="rounded-full bg-white/5 px-6 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!prompt.trim() || isLoading}
                  className="rounded-full bg-canvas-accent px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-canvas-accentMuted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Creating..." : "Create Card"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}