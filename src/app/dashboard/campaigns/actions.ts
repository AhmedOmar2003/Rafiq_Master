"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function approveCampaign(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("promotional_campaigns")
    .update({
      status: "active",
      rejection_reason: null,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id);

  if (error) {
    throw new Error(`فشل اعتماد الإعلان: ${error.message}`);
  }

  revalidatePath("/dashboard/campaigns");
}

export async function rejectCampaign(formData: FormData): Promise<void> {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!id || !reason) {
    throw new Error("لازم تكتب سبب الرفض.");
  }

  const { error } = await supabase
    .from("promotional_campaigns")
    .update({
      status: "rejected",
      rejection_reason: reason,
      approved_at: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id);

  if (error) {
    throw new Error(`فشل رفض الإعلان: ${error.message}`);
  }

  revalidatePath("/dashboard/campaigns");
}
