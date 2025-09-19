import type { DisplayMode } from "../types/session";

interface DisplayModeSelectorProps {
  currentMode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
}

const DISPLAY_MODES = [
  {
    mode: "canvas" as DisplayMode,
    icon: "🎨",
    label: "Canvas",
    description: "Drag & drop cards anywhere"
  },
  {
    mode: "single" as DisplayMode,
    icon: "📄",
    label: "Single",
    description: "One card at a time"
  },
  {
    mode: "grid" as DisplayMode,
    icon: "⊞",
    label: "Grid",
    description: "Organized grid layout"
  },
  {
    mode: "focus" as DisplayMode,
    icon: "🔍",
    label: "Focus",
    description: "Main card + thumbnails"
  },
  {
    mode: "carousel" as DisplayMode,
    icon: "◀▶",
    label: "Carousel",
    description: "Swipe through cards"
  }
];

export function DisplayModeSelector({ currentMode, onModeChange }: DisplayModeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 uppercase tracking-wide">Display:</span>
      <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
        {DISPLAY_MODES.map(({ mode, icon, label, description }) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${currentMode === mode
                ? "bg-canvas-accent text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-white/10"
              }
            `}
            title={description}
          >
            <span className="text-sm">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}