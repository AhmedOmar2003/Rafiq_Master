"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { revalidatePath } from "next/cache";

export async function setReportStatus(
  reportId: string,
  status: "open" | "reviewed" | "actioned" | "dismissed",
  note?: string,
): Promise<void> {
  const supabase = createAdminClient();

  // Routed through the SECURITY DEFINER RPC (0037) so the moderator check
  // and timestamp logic stay in one place.
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>;
  const { error } = await rpc("resolve_abuse_report", {
    _report_id: reportId,
    _new_status: status,
    _note: note?.trim() || null,
  });

  if (error) {
    console.error("[setReportStatus]", error);
    throw new Error(`فشل تحديث البلاغ: ${error.message}`);
  }

  await logAdminAction({
    action: "set_report_status",
    entityType: "report",
    entityId: reportId,
    payload: {
      status,
      note: note?.trim() || null,
      source: "dashboard",
    },
  });
  revalidatePath("/dashboard/reports");
}
