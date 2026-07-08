"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface FeedbackFormState {
  error?: string;
  ok?: boolean;
}

export async function submitFeedback(
  _prev: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const category = String(formData.get("category") ?? "general");
  const priority = String(formData.get("priority") ?? "medium");

  if (!title) return { error: "A short title is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: staff } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!staff) return { error: "No clinic linked to this account." };

  const { error } = await supabase.from("feedback").insert({
    organization_id: staff.organization_id,
    user_id: user.id,
    title,
    body: body || null,
    category,
    priority,
  });
  if (error) return { error: error.message };

  revalidatePath("/feedback");
  return { ok: true };
}
