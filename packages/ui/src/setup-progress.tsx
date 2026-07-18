export interface SetupItem {
  label: string;
  done: boolean;
}

/** "Complete your clinic" checklist (founder-approved mockup). Wired to
 * REAL completion state by the caller — never decorative percentages. */
export function SetupProgress({ items }: { items: SetupItem[] }) {
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <div className="rounded-2xl border border-lavender-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Complete your clinic</h2>
        <span className="rounded-full bg-lavender px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand-deep">
          {done} of {items.length} · {pct}%
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-lavender">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {items.map((item) => (
          <span
            key={item.label}
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              item.done ? "text-ink" : "text-muted"
            }`}
          >
            <span
              className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold ${
                item.done ? "bg-ok-soft text-ok" : "bg-ground text-muted"
              }`}
            >
              {item.done ? "✓" : "○"}
            </span>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
