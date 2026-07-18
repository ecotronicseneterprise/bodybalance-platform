import { Card } from "@bodybalance/ui";
import { createClient } from "@/lib/supabase/server";
import { FeedbackForm } from "./feedback-form";

const CATEGORY_LABEL: Record<string, string> = {
  workflow: "Workflow",
  feature_request: "Feature",
  bug: "Bug",
  general: "General",
};

export default async function FeedbackPage() {
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("feedback")
    .select("id, title, body, category, priority, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Feedback</h1>
      <p className="mt-1 text-sm text-muted">
        Tell us what you need to run your clinic better — workflow gaps matter
        more to us than anything else.
      </p>

      <div className="mt-6">
        <FeedbackForm />
      </div>

      <div className="mt-8 space-y-3">
        {(entries ?? []).map((f) => (
          <Card key={f.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-ink">{f.title}</p>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                <span className="rounded-full bg-lavender px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-deep">
                  {CATEGORY_LABEL[f.category] ?? f.category}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    f.priority === "high"
                      ? "bg-danger-soft text-danger"
                      : "bg-ground text-muted"
                  }`}
                >
                  {f.priority}
                </span>
                <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ok">
                  {f.status}
                </span>
              </div>
            </div>
            {f.body ? <p className="mt-1 text-sm text-muted">{f.body}</p> : null}
            <p className="mt-2 text-xs text-muted/70">
              {new Date(f.created_at).toLocaleString()}
            </p>
          </Card>
        ))}
        {(entries ?? []).length === 0 ? (
          <p className="text-center text-sm text-muted">
            No feedback yet — you&apos;ll be the first.
          </p>
        ) : null}
      </div>
    </div>
  );
}
