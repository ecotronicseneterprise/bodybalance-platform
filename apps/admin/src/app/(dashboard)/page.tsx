import { Card } from "@bodybalance/ui";
import { createClient } from "@/lib/supabase/server";

/**
 * Dashboard home — restyled with platform tokens (2A). The full operational
 * "Today's Clinic" layout (queues, timeline, quick actions) arrives in 2C;
 * today's version keeps the live numbers Cherry can sanity-check.
 */
export default async function DashboardHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staff } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = staff?.full_name?.split(" ")[0] ?? "there";

  const [patients, pending, confirmed, weekSessions, weekBookings, feedbackOpen] =
    await Promise.all([
      supabase.from("patients").select("id", { count: "exact", head: true }),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_confirmation"),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed"),
      supabase
        .from("chat_sessions")
        .select("id", { count: "exact", head: true })
        .gte("started_at", weekAgo),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo),
      supabase
        .from("feedback")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
    ]);

  const stats = [
    { label: "Pending bookings", value: pending.count ?? 0, highlight: (pending.count ?? 0) > 0 },
    { label: "Confirmed upcoming", value: confirmed.count ?? 0 },
    { label: "Patients", value: patients.count ?? 0 },
    { label: "Bookings (7 days)", value: weekBookings.count ?? 0 },
    { label: "Conversations (7 days)", value: weekSessions.count ?? 0 },
    { label: "Open feedback", value: feedbackOpen.count ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-xl font-semibold tracking-tight text-ink">
        {greeting}, {firstName}
      </h1>
      <p className="mt-1 text-sm text-muted">
        Here&apos;s where your clinic stands right now.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className={`p-4 ${s.highlight ? "border-brand" : ""}`}
          >
            <p className="text-2xl font-semibold tabular-nums text-ink">{s.value}</p>
            <p className="mt-1 text-xs text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-ink">What&apos;s next</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Appointment queues, services, practitioners, and your AI assistant
          arrive over the coming sprints. Anything you need sooner — tell us in{" "}
          <a href="/feedback" className="font-medium text-brand hover:underline">
            Feedback
          </a>
          ; every entry lands directly with the team.
        </p>
      </Card>
    </div>
  );
}
