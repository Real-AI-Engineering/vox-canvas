interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-3xl border border-white/10 bg-white/5 text-center text-sm text-slate-300">
      <h3 className="text-base font-semibold text-white/90">{title}</h3>
      <p className="max-w-sm text-pretty text-slate-400">{description}</p>
    </div>
  );
}
