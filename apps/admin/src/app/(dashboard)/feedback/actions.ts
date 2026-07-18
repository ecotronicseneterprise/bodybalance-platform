"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { withStaffContext } from "@/lib/staff-action";

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

  const result = await withStaffContext("submit_feedback", async (ctx) => {
    const supabase = await createClient();
    const { error } = await supabase.from("feedback").insert({
      organization_id: ctx.organizationId,
      user_id: ctx.userId,
      title,
      body: body || null,
      category,
      priority,
    });
    if (error) throw new Error(error.message);
  });

  if (!result.ok) return { error: result.error };
  revalidatePath("/feedback");
  return { ok: true };
}
