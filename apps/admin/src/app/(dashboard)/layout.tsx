import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { label: "Dashboard", href: "/", live: true },
  { label: "Feedback", href: "/feedback", live: true },
  { label: "Appointments", href: "#", live: false },
  { label: "Services", href: "#", live: false },
  { label: "Therapists", href: "#", live: false },
  { label: "Knowledge", href: "#", live: false },
  { label: "Settings", href: "#", live: false },
];

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

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <p className="truncate font-semibold">{staff.organizations?.name}</p>
          <p className="truncate text-xs text-gray-500">
            {staff.full_name} · {staff.role}
          </p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) =>
            item.live ? (
              <Link
                key={item.label}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {item.label}
              </Link>
            ) : (
              <span
                key={item.label}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-gray-400"
              >
                {item.label}
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                  soon
                </span>
              </span>
            ),
          )}
        </nav>
        <form action="/auth/signout" method="post" className="border-t border-gray-200 p-3">
          <button className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100">
            Sign out
          </button>
        </form>
      </aside>
      <div className="flex-1 bg-gray-50">{children}</div>
    </div>
  );
}
