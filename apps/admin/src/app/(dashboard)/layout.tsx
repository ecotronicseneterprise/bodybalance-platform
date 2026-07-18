import { redirect } from "next/navigation";
import { Button, type NavItem } from "@bodybalance/ui";
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

  // Final nav per docs/SPRINT-2-PLAN.md. Every item routes to a real,
  // intentional page — sections without functionality yet show designed
  // empty states, never blanks. "Practitioners" label becomes clinic-
  // configurable via terminology settings in 2B.
  const nav: NavItem[] = [
    { label: "Dashboard", href: "/", live: true },
    { label: "Appointments", href: "/appointments", live: true, badge: pendingCount ?? 0 },
    { label: "Patients", href: "/patients", live: true },
    { label: "Services", href: "/services", live: true },
    { label: "Practitioners", href: "/practitioners", live: true },
    { label: "Knowledge", href: "/knowledge", live: true },
    { label: "AI Assistant", href: "/ai-assistant", live: true },
    { label: "Clinic Settings", href: "/clinic-settings", live: true },
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
          <Button variant="secondary" size="sm" className="w-full">
            Sign out
          </Button>
        </form>
      }
    >
      {children}
    </ShellClient>
  );
}
