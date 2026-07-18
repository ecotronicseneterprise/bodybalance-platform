import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

/** Clinic setup — the same flow every clinic uses (founder decision:
 * no manually pre-created owners; first registered user becomes Owner). */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", user!.id)
    .maybeSingle();

  if (existing) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-ground p-6">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-white shadow-card p-8 ">
        <h1 className="text-xl font-semibold tracking-tight">
          Set up your clinic
        </h1>
        <p className="mt-1 text-sm text-muted">
          Review the details below — everything can be changed later in
          Settings.
        </p>
        <OnboardingForm />
      </div>
    </main>
  );
}
