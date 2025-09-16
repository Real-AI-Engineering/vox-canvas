import { useMemo } from "react";

import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { TranscriptFragment } from "../types/session";

interface TranscriptListProps {
  fragments: TranscriptFragment[];
}

export function TranscriptList({ fragments }: TranscriptListProps) {
  const debouncedFragments = useDebouncedValue(fragments, 150);

  const items = useMemo(() => {
    return debouncedFragments.map((fragment) => (
      <article
        key={fragment.id}
        className="rounded-2xl border border-white/5 bg-white/[0.04] p-4 shadow-inner shadow-black/20"
      >
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
          {fragment.speaker && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
              {fragment.speaker}
            </span>
          )}
          <span>{fragment.time}</span>
          {typeof fragment.confidence === "number" && (
            <span className="text-[10px] text-slate-500">
              {Math.round(fragment.confidence * 100)}%
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-slate-100">{fragment.text}</p>
      </article>
    ));
  }, [debouncedFragments]);

  if (items.length === 0) {
    return null;
  }

  return <div className="flex-1 space-y-4 overflow-y-auto pr-2">{items}</div>;
}
