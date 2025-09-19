import { useState } from "react";
import type { CardType } from "../types/session";
import { CARD_TEMPLATES, getAllTags, type CardTemplate } from "../data/cardTemplates";

interface CardTemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: CardTemplate) => void;
}

const CATEGORIES = [
  { id: "analytics", name: "Аналитика", icon: "📊", description: "Анализ и статистика" },
  { id: "productivity", name: "Продуктивность", icon: "✅", description: "Задачи и решения" },
  { id: "communication", name: "Коммуникации", icon: "💬", description: "Общение и взаимодействие" },
  { id: "custom", name: "Прочее", icon: "🎨", description: "Пользовательские шаблоны" }
] as const;

export function CardTemplateLibrary({ isOpen, onClose, onSelectTemplate }: CardTemplateLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<CardTemplate["category"] | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  if (!isOpen) return null;

  const allTags = getAllTags();

  const filteredTemplates = CARD_TEMPLATES.filter(template => {
    // Category filter
    if (selectedCategory !== "all" && template.category !== selectedCategory) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!template.name.toLowerCase().includes(query) &&
          !template.description.toLowerCase().includes(query) &&
          !template.tags.some(tag => tag.toLowerCase().includes(query))) {
        return false;
      }
    }

    // Tags filter
    if (selectedTags.length > 0) {
      if (!selectedTags.some(tag => template.tags.includes(tag))) {
        return false;
      }
    }

    return true;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const getCardTypeIcon = (type: CardType) => {
    switch (type) {
      case "summary": return "📄";
      case "keywords": return "🏷️";
      case "sentiment": return "💭";
      case "counter": return "🔢";
      case "list": return "📝";
      case "chart": return "📊";
      case "custom": return "🎨";
      default: return "📋";
    }
  };

  const handleSelectTemplate = (template: CardTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur" onClick={onClose}>
      <div
        className="w-full max-w-6xl max-h-[90vh] rounded-3xl border border-white/10 bg-canvas-surface/95 p-6 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Библиотека шаблонов карточек</h2>
            <p className="text-sm text-slate-400 mt-1">Выберите готовый шаблон или создайте свой</p>
          </div>
          <button
            onClick={onClose}
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            Закрыть
          </button>
        </header>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск шаблонов..."
              className="w-full rounded-xl border border-white/10 bg-canvas-background/60 px-4 py-2 text-sm text-white placeholder-white/50 outline-none focus:border-canvas-accent"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-canvas-accent text-white"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              Все категории
            </button>
            {CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === category.id
                    ? "bg-canvas-accent text-white"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
                title={category.description}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {allTags.slice(0, 10).map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-canvas-accent/20 text-canvas-accent border border-canvas-accent/30"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="group text-left rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-canvas-accent hover:bg-white/10"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-2xl">{getCardTypeIcon(template.type)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white group-hover:text-canvas-accent transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded text-xs bg-white/10 text-slate-300"
                    >
                      #{tag}
                    </span>
                  ))}
                  {template.tags.length > 3 && (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-white/10 text-slate-300">
                      +{template.tags.length - 3}
                    </span>
                  )}
                </div>

                {/* Features */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="capitalize">{template.type}</span>
                  {template.autoUpdate && (
                    <>
                      <span>•</span>
                      <span>Авто-обновление</span>
                    </>
                  )}
                  {template.refreshInterval && (
                    <>
                      <span>•</span>
                      <span>{template.refreshInterval}с</span>
                    </>
                  )}
                </div>

                {/* Example preview */}
                {template.example && (
                  <div className="mt-3 p-2 rounded bg-black/20 text-xs text-slate-300 line-clamp-2">
                    {template.example}
                  </div>
                )}
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="flex items-center justify-center h-32 text-slate-400">
              <div className="text-center">
                <div className="text-2xl mb-2">🔍</div>
                <div>Шаблоны не найдены</div>
                <div className="text-xs mt-1">Попробуйте изменить фильтры</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-slate-400">
            Найдено шаблонов: {filteredTemplates.length} из {CARD_TEMPLATES.length}
          </p>
        </footer>
      </div>
    </div>
  );
}