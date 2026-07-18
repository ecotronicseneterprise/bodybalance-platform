import { Button, Card, EmptyState, PageHeader } from "@bodybalance/ui";
import { createClient } from "@/lib/supabase/server";

export default async function PractitionersPage() {
  const supabase = await createClient();
  const { data: practitioners } = await supabase
    .from("therapists")
    .select("id, display_name, credentials, active")
    .is("deleted_at", null)
    .order("display_name");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Practitioners"
        description="Your team — names, credentials, photos, and who's available when. Patients choose a practitioner while booking."
        action={<Button disabled>Add practitioner (soon)</Button>}
      />
      {(practitioners ?? []).length > 0 ? (
        <div className="mt-6 space-y-3">
          {practitioners!.map((p) => (
            <Card key={p.id} className="flex items-center gap-4 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-lavender text-sm font-semibold text-brand-deep">
                {p.display_name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <p className="font-medium text-ink">{p.display_name}</p>
                {p.credentials ? (
                  <p className="mt-0.5 text-xs text-muted">{p.credentials}</p>
                ) : null}
              </div>
            </Card>
          ))}
          <p className="pt-1 text-center text-xs text-muted">
            Editing your team arrives with the next update.
          </p>
        </div>
      ) : (
        <Card className="mt-6">
          <EmptyState
            glyph="+"
            title="No practitioners yet"
            description="Add yourself and your team so patients can choose who they'd like to see."
            action={<Button disabled>Add practitioner (soon)</Button>}
          />
        </Card>
      )}
    </div>
  );
}
