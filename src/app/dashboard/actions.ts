"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";

type LaunchAlertStatus = "acknowledged" | "resolved";

async function setLaunchSafetyAlertStatus(
  formData: FormData,
  status: LaunchAlertStatus,
): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("معرّف التنبيه غير صالح.");
  }

  const now = new Date().toISOString();
  const updates =
    status === "acknowledged"
      ? { status, acknowledged_at: now }
      : { status, resolved_at: now };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("launch_safety_alerts")
    .update(updates as never)
    .eq("id", id)
    .neq("status", "resolved");

  if (error) {
    throw new Error(`معرفناش نحدّث تنبيه الإطلاق: ${error.message}`);
  }

  await logAdminAction({
    action: `launch_alert_${status}`,
    entityType: "launch_safety_alert",
    entityId: id,
    payload: { status, source: "dashboard" },
  });

  revalidatePath("/dashboard");
}

export async function acknowledgeLaunchSafetyAlert(
  formData: FormData,
): Promise<void> {
  await setLaunchSafetyAlertStatus(formData, "acknowledged");
}

export async function resolveLaunchSafetyAlert(formData: FormData): Promise<void> {
  await setLaunchSafetyAlertStatus(formData, "resolved");
}
