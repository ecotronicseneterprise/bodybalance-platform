import type { ReactNode } from "react";

export interface EmptyStateProps {
  /** Single glyph or short mark rendered in the lavender tile. */
  glyph: string;
  title: string;
  description: string;
  action?: ReactNode;
}

/** First-class empty state (SPRINT-2-PLAN 2A): every list/page ships one.
 * Reads as "this is coming and here's what it'll do" — never silence. */
export function EmptyState({ glyph, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-lavender text-xl font-semibold text-brand-deep">
        {glyph}
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
