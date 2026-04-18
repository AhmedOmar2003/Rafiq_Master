"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function deleteReview(review_id: number): Promise<void> {
  const supabase = createAdminClient();
  
  const { error } = await supabase.from("reviews").delete().eq("review_id", review_id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/reviews");
}
