"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TIMEZONES = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Europe/London",
];

export function OnboardingForm() {
  const router = useRouter();
  const [clinicName, setClinicName] = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (whatsapp && !/^\+[1-9][0-9]{6,14}$/.test(whatsapp)) {
      setError("WhatsApp number must be in international format, e.g. +2348012345678");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("onboard_organization", {
      p_clinic_name: clinicName,
      p_full_name: fullName,
      p_timezone: timezone,
      p_city: city || undefined,
      p_whatsapp: whatsapp || undefined,
    });
    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="clinicName" className="block text-sm font-medium text-ink">
          Clinic name *
        </label>
        <input
          id="clinicName"
          required
          value={clinicName}
          onChange={(e) => setClinicName(e.target.value)}
          placeholder="e.g. Harborview Clinic"
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-ink">
          Your full name *
        </label>
        <input
          id="fullName"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Dr. Amina Bello"
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-ink">
            City
          </label>
          <input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Lagos"
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-ink">
            Timezone
          </label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="whatsapp" className="block text-sm font-medium text-ink">
          Clinic WhatsApp number
        </label>
        <input
          id="whatsapp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+2348012345678"
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none"
        />
        <p className="mt-1 text-xs text-muted">
          Used for appointment notifications. You can add it later.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
      >
        {loading ? "Creating your clinic…" : "Create clinic"}
      </button>
      <p className="text-center text-xs text-muted">
        You&apos;ll be the clinic owner. Default opening hours (Mon–Fri 9–5)
        are applied — adjust them in Settings.
      </p>
    </form>
  );
}
