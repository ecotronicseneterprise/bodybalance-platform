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
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold tracking-tight">Feedback</h1>
      <p className="mt-1 text-sm text-gray-500">
        Tell us what you need to run your clinic better — workflow gaps matter
        more to us than anything else.
      </p>

      <div className="mt-6">
        <FeedbackForm />
      </div>

      <div className="mt-8 space-y-3">
        {(entries ?? []).map((f) => (
          <div key={f.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{f.title}</p>
              <div className="flex shrink-0 gap-1">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-600">
                  {CATEGORY_LABEL[f.category] ?? f.category}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                    f.priority === "high"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {f.priority}
                </span>
                <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-green-800">
                  {f.status}
                </span>
              </div>
            </div>
            {f.body ? <p className="mt-1 text-sm text-gray-600">{f.body}</p> : null}
            <p className="mt-2 text-xs text-gray-400">
              {new Date(f.created_at).toLocaleString()}
            </p>
          </div>
        ))}
        {(entries ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">No feedback yet.</p>
        ) : null}
      </div>
    </main>
  );
}
