import { Card, EmptyState, PageHeader } from "@bodybalance/ui";

const TABS = ["General", "Branding", "Business Hours", "Appointments", "Notifications"];

export default function ClinicSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Clinic Settings"
        description="Everything about your clinic in one place — name, hours, branding, and how your team is labelled."
      />
      <Card className="mt-6">
        <div className="flex gap-1 overflow-x-auto border-b border-line px-3 pt-2">
          {TABS.map((t, i) => (
            <span
              key={t}
              className={`whitespace-nowrap px-3 pb-2.5 pt-1.5 text-sm font-medium ${
                i === 0
                  ? "border-b-2 border-brand text-brand-deep"
                  : "text-muted"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
        <EmptyState
          glyph="+"
          title="Editing arrives with the next update"
          description="Your clinic's details from onboarding are saved and in use. Soon you'll edit everything here — opening hours, brand colors, your logo, and the terminology that fits your clinic type."
        />
      </Card>
    </div>
  );
}
