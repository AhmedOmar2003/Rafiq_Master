"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { revalidatePath } from "next/cache";

export async function deleteReview(review_id: number): Promise<void> {
  const supabase = createAdminClient();
  const { data: review } = await supabase
    .from("reviews")
    .select("review_id,place_id,name,rating")
    .eq("review_id", review_id)
    .maybeSingle();
  
  const { error } = await supabase.from("reviews").delete().eq("review_id", review_id);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAction({
    action: "delete_review",
    entityType: "review",
    entityId: null,
    payload: {
      review_id,
      place_id: (review as { place_id?: string | number | null } | null)?.place_id ?? null,
      reviewer_name: (review as { name?: string | null } | null)?.name ?? null,
      rating: (review as { rating?: number | null } | null)?.rating ?? null,
      source: "dashboard",
    },
  });

  revalidatePath("/dashboard/reviews");
}
