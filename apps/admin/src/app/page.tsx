import { createClient } from "@/lib/supabase/server";

/**
 * Protected admin home. Middleware guarantees a session; this resolves the
 * staff member's organization context through their users row — RLS-scoped,
 * so a staff account can only ever see its own clinic (BLUEPRINT 2.1).
 */
export default async function AdminHome() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staff } = await supabase
    .from("users")
    .select("full_name, role, organization_id, organizations(name, slug)")
    .eq("id", user!.id)
    .maybeSingle();

  if (!staff) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
        <h1 className="text-xl font-semibold">Account not linked</h1>
        <p className="max-w-md text-center text-sm text-gray-600">
          Your login exists but is not linked to a clinic staff record. Ask
          your platform administrator to complete onboarding.
        </p>
        <form action="/auth/signout" method="post">
          <button className="mt-2 rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
            Sign out
          </button>
        </form>
      </main>
    );
  }

  const org = staff.organizations;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <header className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{org?.name}</h1>
          <p className="text-sm text-gray-500">
            Signed in as {staff.full_name} · {staff.role}
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="font-medium">Sprint 1 — foundation online</h2>
        <p className="mt-2 text-sm text-gray-600">
          Authentication and organization context are live. Booking queues,
          services, therapists, and knowledge management arrive in Sprint 2
          (BLUEPRINT.md section 10).
        </p>
      </section>
    </main>
  );
}
