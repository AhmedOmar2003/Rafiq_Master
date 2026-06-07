"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
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
  const { data: appeal, error: appealError } = await supabase
    .from("place_appeals")
    .select("id,appeal_type,edit_submission_id,place_id,provider_id")
    .eq("id", appealId)
    .single();
  if (appealError) {
    throw new Error(`تعذر جلب الطعن: ${appealError.message}`);
  }

  const typedAppeal = appeal as {
    appeal_type?: string | null;
    edit_submission_id?: string | null;
    place_id?: number | null;
    provider_id?: string | null;
  };

  const { error } = await supabase.rpc(
    "admin_set_place_appeal_status" as never,
    {
      _appeal_id: appealId,
      _status: status,
      _note: note?.trim() || null,
    } as never,
  );

  if (error) {
    console.error("[setAppealStatus] error:", error);
    throw new Error(`فشل تحديث الطعن: ${error.message}`);
  }

  await logAdminAction({
    action: "set_appeal_status",
    entityType: "appeal",
    entityId: appealId,
    payload: {
      status,
      note: note?.trim() || null,
      appeal_type: typedAppeal.appeal_type ?? "place_rejection",
      edit_submission_id: typedAppeal.edit_submission_id ?? null,
      place_id: typedAppeal.place_id ?? null,
      provider_id: typedAppeal.provider_id ?? null,
      source: "dashboard",
    },
  });
  revalidatePath("/dashboard/appeals");
  revalidatePath("/dashboard/places");
}
