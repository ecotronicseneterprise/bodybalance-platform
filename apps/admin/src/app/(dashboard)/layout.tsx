import { redirect } from "next/navigation";
import type { NavItem } from "@bodybalance/ui";
import { createClient } from "@/lib/supabase/server";
import { ShellClient } from "./shell-client";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  receptionist: "Receptionist",
  therapist: "Practitioner",
};

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staff } = await supabase
    .from("users")
    .select("full_name, role, organizations(name)")
    .eq("id", user!.id)
    .maybeSingle();

  if (!staff) redirect("/onboarding");

  const { count: pendingCount } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_confirmation");

  // Final nav per docs/SPRINT-2-PLAN.md. "Practitioners" is the neutral
  // default label — 2B makes it clinic-configurable via terminology settings.
  const nav: NavItem[] = [
    { label: "Dashboard", href: "/", live: true },
    { label: "Appointments", href: "#", live: false, badge: pendingCount ?? 0 },
    { label: "Patients", href: "#", live: false },
    { label: "Services", href: "#", live: false },
    { label: "Practitioners", href: "#", live: false },
    { label: "Knowledge", href: "#", live: false },
    { label: "AI Assistant", href: "#", live: false },
    { label: "Clinic Settings", href: "#", live: false },
    { label: "Feedback", href: "/feedback", live: true },
  ];

  return (
    <ShellClient
      clinicName={staff.organizations?.name ?? "Your clinic"}
      userName={staff.full_name}
      roleLabel={ROLE_LABELS[staff.role] ?? staff.role}
      nav={nav}
      signOutSlot={
        <form action="/auth/signout" method="post">
          <button className="w-full rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink/70 hover:bg-ground">
            Sign out
          </button>
        </form>
      }
    >
      {children}
    </ShellClient>
  );
}
