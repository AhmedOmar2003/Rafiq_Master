"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createPlace(formData: FormData) {
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

  const { error } = await supabase.from("places").insert(rawData as never);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/places");
  redirect("/dashboard/places");
}

export async function updatePlace(place_id: number, formData: FormData) {
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

  const { error } = await supabase
    .from("places")
    .update(rawData as never)
    .eq("place_id", place_id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/places");
  redirect("/dashboard/places");
}

export async function deletePlace(place_id: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("places").delete().eq("place_id", place_id);

  if (error) {
    throw new Error(error.message);
  }

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
  status: "pending" | "approved" | "rejected" | "suspended",
  rejectionReason?: string,
): Promise<void> {
  const supabase = createAdminClient();

  // Migration 0030 relaxes the moderation trigger for service_role, so the
  // admin dashboard can update the row directly and let the DB fire the
  // moderation history trigger as usual.
  const { data: existingPlace, error: fetchError } = await supabase
    .from("places")
    .select("approved_at,suspended_at")
    .eq("place_id", placeId)
    .single();

  if (fetchError) {
    throw new Error(`تعذر جلب بيانات المكان: ${fetchError.message}`);
  }

  const { error } = await supabase
    .from("places")
    .update({
      status,
      rejection_reason: status === "rejected" ? rejectionReason ?? null : null,
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
  revalidatePath("/dashboard/places");
}
