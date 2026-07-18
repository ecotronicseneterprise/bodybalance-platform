import { Button, Card, EmptyState, PageHeader } from "@bodybalance/ui";

export default function AppointmentsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Appointments"
        description="Booking requests wait here for your confirmation — patients are notified the moment you act."
        action={<Button disabled>New booking (soon)</Button>}
      />
      <Card className="mt-6">
        <EmptyState
          glyph="✓"
          title="No appointments yet"
          description="When patients book — online or by phone — their requests appear here with everything they told the assistant, ready to confirm in one tap."
        />
      </Card>
    </div>
  );
}
