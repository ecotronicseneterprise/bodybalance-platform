import { Button, Card, EmptyState, PageHeader } from "@bodybalance/ui";
import { createClient } from "@/lib/supabase/server";

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_amount_minor, price_currency, active")
    .is("deleted_at", null)
    .order("name");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Services"
        description="What you offer, how long it takes, and what it costs — this is what patients choose from when booking."
        action={<Button disabled>Add service (soon)</Button>}
      />
      {(services ?? []).length > 0 ? (
        <div className="mt-6 space-y-3">
          {services!.map((s) => (
            <Card key={s.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium text-ink">{s.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {s.duration_minutes} minutes
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-ink">
                {new Intl.NumberFormat("en-NG", {
                  style: "currency",
                  currency: s.price_currency,
                  minimumFractionDigits: 0,
                }).format(s.price_amount_minor / 100)}
              </p>
            </Card>
          ))}
          <p className="pt-1 text-center text-xs text-muted">
            Editing services arrives with the next update.
          </p>
        </div>
      ) : (
        <Card className="mt-6">
          <EmptyState
            glyph="+"
            title="You haven't created any services yet"
            description="Add what your clinic offers — an initial assessment, follow-up sessions, virtual consultations — with your own durations and prices."
            action={<Button disabled>Add first service (soon)</Button>}
          />
        </Card>
      )}
    </div>
  );
}
