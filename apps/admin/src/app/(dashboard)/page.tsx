import { Button, Card, EmptyState, SetupProgress } from "@bodybalance/ui";
import { createClient } from "@/lib/supabase/server";

/**
 * Dashboard home — "Today's Clinic" (founder-approved mockup, plan rev 2):
 * operational, not statistical. Every number and row is real; empty states
 * are honest — no fabricated data, ever.
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = staff?.full_name?.split(" ")[0] ?? "there";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);

  const [pending, today, activity, settings, services, practitioners, availability, knowledge, ai] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id, scheduled_start, patients(full_name), services(name), qualification_summary",
        )
        .eq("status", "pending_confirmation")
        .order("scheduled_start")
        .limit(5),
      supabase
        .from("appointments")
        .select("id, scheduled_start, patients(full_name), services(name)")
        .eq("status", "confirmed")
        .gte("scheduled_start", todayStart.toISOString())
        .lt("scheduled_start", todayEnd.toISOString())
        .order("scheduled_start"),
      supabase
        .from("audit_logs")
        .select("id, action, actor_type, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("clinic_settings").select("whatsapp_number, city").maybeSingle(),
      supabase.from("services").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("therapists").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("therapist_availability").select("id", { count: "exact", head: true }),
      supabase.from("knowledge_documents").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("organization_ai_settings").select("welcome_message").maybeSingle(),
    ]);

  // Honest completion state — checked only when the data actually exists.
  const setupItems = [
    { label: "Clinic created", done: true },
    { label: "Profile", done: Boolean(settings.data?.whatsapp_number || settings.data?.city) },
    { label: "Services", done: (services.count ?? 0) > 0 },
    { label: "Practitioners", done: (practitioners.count ?? 0) > 0 },
    { label: "Availability", done: (availability.count ?? 0) > 0 },
    { label: "Knowledge", done: (knowledge.count ?? 0) > 0 },
    { label: "AI Assistant", done: Boolean(ai.data?.welcome_message) },
  ];
  const setupComplete = setupItems.every((i) => i.done);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  const ACTION_LABELS: Record<string, string> = {
    "organization.onboarded": "Clinic created",
    "booking.requested": "Booking requested",
    "booking.confirmed": "Booking confirmed",
    "booking.declined": "Booking declined",
    "patient.registered": "New patient registered",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-xl font-semibold tracking-tight text-ink">
        {greeting}, {firstName}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {(today.data ?? []).length > 0
          ? `${today.data!.length} confirmed today · ${(pending.data ?? []).length} waiting for confirmation`
          : "Here's where your clinic stands right now."}
      </p>

      {!setupComplete ? (
        <div className="mt-6">
          <SetupProgress items={setupItems} />
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between px-5 pt-4 pb-1">
            <h2 className="text-sm font-semibold text-ink">Waiting for confirmation</h2>
            {(pending.data ?? []).length > 0 ? (
              <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">
                {pending.data!.length} pending
              </span>
            ) : null}
          </div>
          {(pending.data ?? []).length > 0 ? (
            <div className="px-2 pb-2">
              {pending.data!.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-ground">
                  <div className="w-20 shrink-0">
                    <p className="text-sm font-semibold tabular-nums text-ink">{fmtDay(a.scheduled_start)}</p>
                    <p className="text-xs tabular-nums text-muted">{fmtTime(a.scheduled_start)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {a.patients?.full_name ?? "Patient"}
                    </p>
                    <p className="truncate text-xs text-muted">{a.services?.name}</p>
                  </div>
                  <a href="/appointments" className="text-xs font-semibold text-brand hover:underline">
                    View
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              glyph="✓"
              title="Nothing waiting"
              description="New booking requests appear here the moment they arrive."
            />
          )}
        </Card>

        <Card>
          <div className="px-5 pt-4 pb-1">
            <h2 className="text-sm font-semibold text-ink">Today</h2>
          </div>
          {(today.data ?? []).length > 0 ? (
            <div className="px-5 pb-4">
              {today.data!.map((a) => (
                <div key={a.id} className="flex gap-3 border-l-2 border-lavender-line py-2 pl-4">
                  <p className="w-12 shrink-0 text-sm font-semibold tabular-nums text-ink">
                    {fmtTime(a.scheduled_start)}
                  </p>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {a.patients?.full_name ?? "Patient"}
                    </p>
                    <p className="truncate text-xs text-muted">{a.services?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              glyph="◷"
              title="No appointments today"
              description="Confirmed appointments for the day will line up here each morning."
            />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Quick actions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/services"><Button variant="secondary" size="sm">Services</Button></a>
            <a href="/practitioners"><Button variant="secondary" size="sm">Practitioners</Button></a>
            <a href="/knowledge"><Button variant="secondary" size="sm">Teach your assistant</Button></a>
            <a href="/feedback"><Button variant="secondary" size="sm">Send feedback</Button></a>
          </div>
        </Card>

        <Card>
          <div className="px-5 pt-4 pb-1">
            <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
          </div>
          {(activity.data ?? []).length > 0 ? (
            <div className="px-5 pb-4">
              {activity.data!.map((a) => (
                <div key={a.id} className="flex items-baseline justify-between gap-3 border-b border-dashed border-line py-2 text-sm last:border-0">
                  <p className="text-ink">{ACTION_LABELS[a.action] ?? a.action}</p>
                  <p className="shrink-0 text-xs tabular-nums text-muted">
                    {fmtDay(a.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              glyph="◷"
              title="No activity yet"
              description="Every meaningful change in your clinic is recorded here."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
