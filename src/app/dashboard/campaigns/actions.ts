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
      edit_allowed: false,
      edit_request_status: "none",
      edit_request_note: null,
      edit_request_response: null,
      edit_request_requested_at: null,
      edit_request_reviewed_at: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id);

  if (error) {
    throw new Error(`فشل اعتماد الإعلان: ${error.message}`);
  }

  revalidatePath("/dashboard/campaigns");
}

export async function approveCampaignEditRequest(formData: FormData): Promise<void> {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "").trim();
  const response = String(formData.get("response") ?? "").trim();

  if (!id) {
    throw new Error("معرّف الإعلان غير صالح.");
  }

  const { error } = await supabase
    .from("promotional_campaigns")
    .update({
      edit_allowed: true,
      edit_request_status: "approved",
      edit_request_response: response || "تمت الموافقة على طلب التعديل. يمكنك التعديل الآن ثم إعادة الإرسال للمراجعة.",
      edit_request_reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id)
    .eq("edit_request_status", "pending");

  if (error) {
    throw new Error(`فشل فتح التعديل للإعلان: ${error.message}`);
  }

  revalidatePath("/dashboard/campaigns");
}

export async function rejectCampaignEditRequest(formData: FormData): Promise<void> {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!id || !reason) {
    throw new Error("لازم تكتب سبب واضح لرفض طلب التعديل.");
  }

  const { error } = await supabase
    .from("promotional_campaigns")
    .update({
      edit_allowed: false,
      edit_request_status: "rejected",
      edit_request_response: reason,
      edit_request_reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id)
    .eq("edit_request_status", "pending");

  if (error) {
    throw new Error(`فشل رفض طلب تعديل الإعلان: ${error.message}`);
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
      edit_allowed: false,
      edit_request_status: "none",
      edit_request_note: null,
      edit_request_response: null,
      edit_request_requested_at: null,
      edit_request_reviewed_at: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id);

  if (error) {
    throw new Error(`فشل رفض الإعلان: ${error.message}`);
  }

  revalidatePath("/dashboard/campaigns");
}
