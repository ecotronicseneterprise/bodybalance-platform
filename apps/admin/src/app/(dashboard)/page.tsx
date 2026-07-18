import { createClient } from "@/lib/supabase/server";

/**
 * Dashboard home — live numbers, deterministic counts straight from the
 * RLS-scoped tables (the fuller Clinic Intelligence layer with snapshots is
 * Phase 2, BLUEPRINT 3.14). Reads are tenant-bounded by RLS; every count here
 * is reproducible by re-running the query.
 */
export default async function DashboardHome() {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

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
    { label: "Patients", value: patients.count ?? 0 },
    { label: "Pending bookings", value: pending.count ?? 0, highlight: (pending.count ?? 0) > 0 },
    { label: "Confirmed upcoming", value: confirmed.count ?? 0 },
    { label: "Conversations (7d)", value: weekSessions.count ?? 0 },
    { label: "Bookings (7d)", value: weekBookings.count ?? 0 },
    { label: "Open feedback", value: feedbackOpen.count ?? 0 },
  ];

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-lg border bg-white p-4 ${
              s.highlight ? "border-green-700" : "border-gray-200"
            }`}
          >
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="mt-1 text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-gray-500">
        Appointment queues, services, practitioners, and knowledge management
        arrive in Sprint 2. Use <strong>Feedback</strong> to capture anything
        you need while running the clinic — every entry lands directly with
        the team.
      </p>
    </main>
  );
}
