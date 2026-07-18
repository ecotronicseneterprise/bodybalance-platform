import { Button, Card, EmptyState, PageHeader } from "@bodybalance/ui";
import { createClient } from "@/lib/supabase/server";

export default async function KnowledgePage() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("knowledge_documents")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Teach your assistant"
        description="Everything you add here becomes something your assistant can answer accurately — FAQs, exercises, policies, your team's bios. Every edit keeps its full history."
        action={<Button disabled>Teach something new (soon)</Button>}
      />
      <Card className="mt-6">
        <EmptyState
          glyph="+"
          title={count ? `${count} documents ready` : "Nothing taught yet"}
          description={
            count
              ? "Your assistant will know all of this from its first conversation. Adding and editing knowledge from here arrives with the next update."
              : "Start with the questions patients ask most — prices, what happens at a first visit, your cancellation policy. Your assistant learns it all."
          }
        />
      </Card>
    </div>
  );
}
