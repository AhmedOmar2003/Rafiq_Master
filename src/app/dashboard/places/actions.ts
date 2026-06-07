"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { currentAdminRole } from "@/lib/auth/role";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requirePlaceAdmin(options?: { superAdmin?: boolean }) {
  const role = await currentAdminRole();
  if (!role) throw new Error("غير مصرح بتنفيذ الإجراء.");
  if (options?.superAdmin && role !== "super_admin") {
    throw new Error("الحذف النهائي متاح للمشرف الأعلى فقط.");
  }
}

export async function createPlace(formData: FormData) {
  await requirePlaceAdmin();
  const supabase = createAdminClient();

  const budget = (formData.get("budget") as string | null)?.trim() ?? "";
  const rawData = {
    place_name: formData.get("place_name") as string,
    description: formData.get("description") as string,
    price_range: budget,
    budget,
    rating: parseFloat(formData.get("rating") as string) || 0,
    place_address: formData.get("place_address") as string,
    image_path: formData.get("image_path") as string,
    activity_name: formData.get("activity_name") as string,
    city_name: formData.get("city_name") as string,
    // Admin-added places are trusted by definition — the admin IS the
    // moderator, so they go live immediately. Provider-submitted places
    // from the mobile app still default to 'pending' (no patch here) and
    // ride through the normal review queue.
    status: "approved",
    approved_at: new Date().toISOString(),
  };

  const { data: inserted, error } = await supabase
    .from("places")
    .insert(rawData as never)
    .select("id,place_id,place_name,status")
    .single();

  if (error) {
    return { error: error.message };
  }

  await logAdminAction({
    action: "create_place",
    entityType: "place",
    entityId: (inserted as { id?: string } | null)?.id ?? null,
    payload: {
      place_id: (inserted as { place_id?: number } | null)?.place_id ?? null,
      place_name: (inserted as { place_name?: string } | null)?.place_name ?? rawData.place_name,
      status: (inserted as { status?: string } | null)?.status ?? rawData.status,
      source: "dashboard",
    },
  });

  revalidatePath("/dashboard/places");
  redirect("/dashboard/places");
}

export async function updatePlace(place_id: number, formData: FormData) {
  await requirePlaceAdmin();
  const supabase = createAdminClient();

  const budget = (formData.get("budget") as string | null)?.trim() ?? "";
  const rawData = {
    place_name: formData.get("place_name") as string,
    description: formData.get("description") as string,
    price_range: budget,
    budget,
    rating: parseFloat(formData.get("rating") as string) || 0,
    place_address: formData.get("place_address") as string,
    image_path: formData.get("image_path") as string,
    activity_name: formData.get("activity_name") as string,
    city_name: formData.get("city_name") as string,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabase
    .from("places")
    .update(rawData as never)
    .select("id,place_id,place_name")
    .eq("place_id", place_id);

  if (error) {
    throw new Error(error.message);
  }

  const updatedPlace = ((updated ?? []) as Array<{
    id: string;
    place_id: number;
    place_name: string | null;
  }>)[0];

  await logAdminAction({
    action: "update_place",
    entityType: "place",
    entityId: updatedPlace?.id ?? null,
    payload: {
      place_id,
      place_name: updatedPlace?.place_name ?? rawData.place_name,
      source: "dashboard",
    },
  });

  revalidatePath("/dashboard/places");
  redirect("/dashboard/places");
}

export async function deletePlace(place_id: number): Promise<void> {
  await requirePlaceAdmin({ superAdmin: true });
  const supabase = createAdminClient();
  const { data: existingPlace } = await supabase
    .from("places")
    .select("id,place_name")
    .eq("place_id", place_id)
    .maybeSingle();

  const { error } = await supabase.from("places").delete().eq("place_id", place_id);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAction({
    action: "delete_place",
    entityType: "place",
    entityId: (existingPlace as { id?: string } | null)?.id ?? null,
    payload: {
      place_id,
      place_name: (existingPlace as { place_name?: string } | null)?.place_name ?? null,
      source: "dashboard",
    },
  });

  revalidatePath("/dashboard/places");
}

/**
 * Moderation: flip a place's status. Used by the admin's approve / reject /
 * pending / suspend controls on the Places page.
 *
 * The Flutter app reads `places.status` directly to decide whether to show
 * the "تحت المراجعة" countdown card or the live listing, so this is the
 * single switch that flips both sides.
 *
 * `rejection_reason` is only set when transitioning to 'rejected', and the
 * server clears it on any other transition so a re-approved place doesn't
 * carry stale text.
 */
export async function setPlaceStatus(
  placeId: number,
  status: "pending" | "under_review" | "approved" | "rejected" | "suspended",
  rejectionReason?: string,
  /**
   * Only used when status === "rejected".
   * - true  → provider gets an "edit & resubmit" button on the rejected card
   * - false → provider can only appeal, the row stays locked for editing
   */
  allowEdit?: boolean,
): Promise<void> {
  await requirePlaceAdmin();
  const supabase = createAdminClient();

  // Migration 0030 relaxes the moderation trigger for service_role, so the
  // admin dashboard can update the row directly and let the DB fire the
  // moderation history trigger as usual.
  const { data: existingPlaceRaw, error: fetchError } = await supabase
    .from("places")
    .select(
      "id,place_id,place_name,approved_at,suspended_at,status,edit_request_status",
    )
    .eq("place_id", placeId)
    .single();

  if (fetchError) {
    throw new Error(`تعذر جلب بيانات المكان: ${fetchError.message}`);
  }

  const existingPlace = existingPlaceRaw as {
    id: string;
    place_id: number;
    place_name: string | null;
    approved_at: string | null;
    suspended_at: string | null;
    status: string | null;
    edit_request_status: string | null;
  };

  const { error } = await supabase
    .from("places")
    .update({
      status,
      rejection_reason: status === "rejected" ? rejectionReason ?? null : null,
      // edit_allowed is only meaningful while the place sits in 'rejected'.
      // For any other status we reset it to false so a future rejection
      // doesn't inherit a stale "true" from the past.
      edit_allowed: status === "rejected" ? (allowEdit ?? false) : false,
      edit_request_status:
        status === "approved"
          ? "none"
          : status === "rejected" &&
              existingPlace.edit_request_status === "submitted"
            ? "rejected"
            : existingPlace.edit_request_status ?? "none",
      edit_request_response:
        status === "rejected" &&
        existingPlace.edit_request_status === "submitted"
          ? rejectionReason ?? null
          : status === "approved"
            ? null
            : undefined,
      edit_request_reviewed_at:
        status === "rejected" &&
        existingPlace.edit_request_status === "submitted"
          ? new Date().toISOString()
          : status === "approved"
            ? null
            : undefined,
      approved_at:
        status === "approved"
          ? new Date().toISOString()
          : existingPlace.approved_at,
      suspended_at:
        status === "suspended"
          ? new Date().toISOString()
          : existingPlace.suspended_at,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("place_id", placeId);

  if (error) {
    throw new Error(`فشل تحديث الحالة: ${error.message}`);
  }

  await logAdminAction({
    action: "set_place_status",
    entityType: "place",
    entityId: existingPlace.id,
    payload: {
      place_id: existingPlace.place_id,
      place_name: existingPlace.place_name,
      from_status: existingPlace.status,
      to_status: status,
      rejection_reason: rejectionReason ?? null,
      allow_edit: allowEdit ?? null,
      source: "dashboard",
    },
  });
  revalidatePath("/dashboard/places");
}

/**
 * Flip the edit_allowed switch on a place that's already rejected, without
 * changing the moderation status. Lets the admin reopen or re-lock edits
 * after the initial decision (e.g. provider DMed asking for another chance).
 */
export async function setPlaceEditAllowed(
  placeId: number,
  allowed: boolean,
): Promise<void> {
  await requirePlaceAdmin();
  const supabase = createAdminClient();
  const { data: existingPlace } = await supabase
    .from("places")
    .select("id,place_id,place_name")
    .eq("place_id", placeId)
    .maybeSingle();

  const { error } = await supabase
    .from("places")
    .update({
      edit_allowed: allowed,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("place_id", placeId);
  if (error) {
    throw new Error(`فشل تعديل صلاحية التعديل: ${error.message}`);
  }

  await logAdminAction({
    action: "set_place_edit_allowed",
    entityType: "place",
    entityId: (existingPlace as { id?: string } | null)?.id ?? null,
    payload: {
      place_id: placeId,
      place_name: (existingPlace as { place_name?: string } | null)?.place_name ?? null,
      allowed,
      source: "dashboard",
    },
  });
  revalidatePath("/dashboard/places");
}

export async function approvePlaceEditRequest(
  placeId: number,
  response = "تمت الموافقة على طلب التعديل. يقدر مقدم الخدمة يعدّل المكان ويرسله للمراجعة.",
): Promise<void> {
  await requirePlaceAdmin();
  const supabase = createAdminClient();
  const { data: place, error: fetchError } = await supabase
    .from("places")
    .select("id,place_id,place_name,status,edit_request_status")
    .eq("place_id", placeId)
    .single();

  if (fetchError) {
    throw new Error(`تعذر جلب طلب التعديل: ${fetchError.message}`);
  }

  const existing = place as {
    id: string;
    place_id: number;
    place_name: string | null;
    status: string | null;
    edit_request_status: string | null;
  };
  if (existing.status !== "approved" || existing.edit_request_status !== "pending") {
    throw new Error("طلب التعديل لم يعد متاحًا للموافقة.");
  }

  const { error } = await supabase
    .from("places")
    .update({
      edit_request_status: "approved",
      edit_request_response: response,
      edit_request_reviewed_at: new Date().toISOString(),
      edit_allowed: true,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("place_id", placeId)
    .eq("edit_request_status", "pending");

  if (error) {
    throw new Error(`فشل قبول طلب التعديل: ${error.message}`);
  }

  await logAdminAction({
    action: "approve_place_edit_request",
    entityType: "place",
    entityId: existing.id,
    payload: {
      place_id: existing.place_id,
      place_name: existing.place_name,
      response,
      source: "dashboard",
    },
  });
  revalidatePath("/dashboard/places");
  revalidatePath("/dashboard/activity");
}

export async function rejectPlaceEditRequest(
  placeId: number,
  reason: string,
): Promise<void> {
  await requirePlaceAdmin();
  const cleanReason = reason.trim();
  if (!cleanReason) {
    throw new Error("اكتب سبب رفض طلب التعديل.");
  }

  const supabase = createAdminClient();
  const { data: place, error: fetchError } = await supabase
    .from("places")
    .select("id,place_id,place_name,status,edit_request_status")
    .eq("place_id", placeId)
    .single();

  if (fetchError) {
    throw new Error(`تعذر جلب طلب التعديل: ${fetchError.message}`);
  }

  const existing = place as {
    id: string;
    place_id: number;
    place_name: string | null;
    status: string | null;
    edit_request_status: string | null;
  };
  if (existing.status !== "approved" || existing.edit_request_status !== "pending") {
    throw new Error("طلب التعديل لم يعد متاحًا للرفض.");
  }

  const { error } = await supabase
    .from("places")
    .update({
      edit_request_status: "rejected",
      edit_request_response: cleanReason,
      edit_request_reviewed_at: new Date().toISOString(),
      edit_allowed: false,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("place_id", placeId)
    .eq("edit_request_status", "pending");

  if (error) {
    throw new Error(`فشل رفض طلب التعديل: ${error.message}`);
  }

  await logAdminAction({
    action: "reject_place_edit_request",
    entityType: "place",
    entityId: existing.id,
    payload: {
      place_id: existing.place_id,
      place_name: existing.place_name,
      reason: cleanReason,
      source: "dashboard",
    },
  });
  revalidatePath("/dashboard/places");
  revalidatePath("/dashboard/activity");
}

export async function approvePlaceEditSubmission(
  submissionId: string,
): Promise<void> {
  await requirePlaceAdmin();
  const supabase = createAdminClient();

  const { data: submission, error: fetchError } = await supabase
    .from("place_edit_submissions")
    .select("id,place_id,provider_id,previous_data,proposed_data,status")
    .eq("id", submissionId)
    .single();
  if (fetchError) {
    throw new Error(`تعذر جلب التعديل المقترح: ${fetchError.message}`);
  }

  const { error } = await supabase.rpc(
    "admin_review_place_edit_submission" as never,
    {
      _submission_id: submissionId,
      _decision: "approved",
      _reason: null,
    } as never,
  );
  if (error) {
    throw new Error(`فشل اعتماد التعديل: ${error.message}`);
  }

  await logAdminAction({
    action: "approve_place_edit_submission",
    entityType: "place_edit_submission",
    entityId: submissionId,
    payload: {
      place_id: (submission as { place_id?: string }).place_id ?? null,
      provider_id: (submission as { provider_id?: string }).provider_id ?? null,
      previous_data:
        (submission as { previous_data?: Record<string, unknown> }).previous_data ?? null,
      proposed_data:
        (submission as { proposed_data?: Record<string, unknown> }).proposed_data ?? null,
      source: "dashboard",
    },
  });
  revalidatePath("/dashboard/places");
  revalidatePath("/dashboard/activity");
}

export async function rejectPlaceEditSubmission(
  submissionId: string,
  reason: string,
): Promise<void> {
  await requirePlaceAdmin();
  const cleanReason = reason.trim();
  if (!cleanReason) {
    throw new Error("اكتب سبب رفض التعديل.");
  }

  const supabase = createAdminClient();
  const { data: submission, error: fetchError } = await supabase
    .from("place_edit_submissions")
    .select("id,place_id,provider_id,previous_data,proposed_data,status")
    .eq("id", submissionId)
    .single();
  if (fetchError) {
    throw new Error(`تعذر جلب التعديل المقترح: ${fetchError.message}`);
  }

  const { error } = await supabase.rpc(
    "admin_review_place_edit_submission" as never,
    {
      _submission_id: submissionId,
      _decision: "rejected",
      _reason: cleanReason,
    } as never,
  );
  if (error) {
    throw new Error(`فشل رفض التعديل: ${error.message}`);
  }

  await logAdminAction({
    action: "reject_place_edit_submission",
    entityType: "place_edit_submission",
    entityId: submissionId,
    payload: {
      place_id: (submission as { place_id?: string }).place_id ?? null,
      provider_id: (submission as { provider_id?: string }).provider_id ?? null,
      reason: cleanReason,
      previous_data:
        (submission as { previous_data?: Record<string, unknown> }).previous_data ?? null,
      proposed_data:
        (submission as { proposed_data?: Record<string, unknown> }).proposed_data ?? null,
      source: "dashboard",
    },
  });
  revalidatePath("/dashboard/places");
  revalidatePath("/dashboard/appeals");
  revalidatePath("/dashboard/activity");
}
