"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Mark an appeal as reviewed. Optionally save a short note that we sent the
 * provider feedback on (e.g. "تواصلت معه وأعدت الاعتماد").
 */
export async function setAppealStatus(
  appealId: string,
  status: "pending" | "reviewing" | "resolved" | "rejected",
  note?: string,
): Promise<void> {
  const supabase = createAdminClient();

  const patch: Record<string, unknown> = {
    status,
    reviewed_at: status === "pending" ? null : new Date().toISOString(),
    reviewer_note: note?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("place_appeals")
    .update(patch as never)
    .eq("id", appealId);

  if (error) {
    console.error("[setAppealStatus] error:", error);
    throw new Error(`فشل تحديث الطعن: ${error.message}`);
  }
  revalidatePath("/dashboard/appeals");
}
