import { Card, PageHeader } from "@bodybalance/ui";
import { createClient } from "@/lib/supabase/server";

/** AI Assistant — an employee, not a settings page (SPRINT-2-PLAN rev 2).
 * Shows the REAL configured identity; configuration editing and live
 * conversations arrive in later updates. No fabricated stats. */
export default async function AiAssistantPage() {
  const supabase = await createClient();
  const [{ data: ai }, { count: knowledgeCount }] = await Promise.all([
    supabase
      .from("organization_ai_settings")
      .select("assistant_name, tone, supported_languages")
      .maybeSingle(),
    supabase
      .from("knowledge_documents")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
  ]);

  const name = ai?.assistant_name ?? "Your assistant";
  const facts = [
    { label: "Working hours", value: "24 / 7" },
    {
      label: "Languages",
      value: (ai?.supported_languages ?? ["en"])
        .map((l) => (l === "en" ? "English" : l))
        .join(", "),
    },
    { label: "Tone", value: ai?.tone ? ai.tone[0]!.toUpperCase() + ai.tone.slice(1) : "Warm" },
    {
      label: "Knows",
      value: `${knowledgeCount ?? 0} ${knowledgeCount === 1 ? "document" : "documents"}`,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="AI Assistant"
        description="Your 24/7 receptionist — a team member you configure, not a settings page."
      />
      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-2xl font-bold text-white">
            {name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Meet {name}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Answers from your clinic&apos;s own knowledge — never invented.
            </p>
          </div>
          <span className="rounded-full bg-lavender px-3 py-1 text-xs font-semibold text-brand-deep">
            Profile ready — conversations unlock once setup is complete
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl border border-line bg-ground p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {f.label}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">{f.value}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="mt-4 p-5">
        <p className="text-sm leading-relaxed text-muted">
          From here you&apos;ll shape how {name} speaks — name, greeting, tone,
          languages — and choose a personality preset for your clinic type.
          The medical disclaimer always stays on: that&apos;s a platform safety
          rule no clinic can change.
        </p>
      </Card>
    </div>
  );
}
