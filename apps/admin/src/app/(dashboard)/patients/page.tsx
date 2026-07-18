import { Card, EmptyState, PageHeader } from "@bodybalance/ui";

export default function PatientsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Patients"
        description="Your patient list builds itself as bookings come in — a clean timeline per patient, not a CRM."
      />
      <Card className="mt-6">
        <EmptyState
          glyph="+"
          title="No patients yet"
          description="Every person who books becomes a patient record here: contact details and their appointment history, nothing you don't need."
        />
      </Card>
    </div>
  );
}
