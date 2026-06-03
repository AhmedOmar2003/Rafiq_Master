import "server-only";

import { currentAdminRole } from "@/lib/auth/role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSsrClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AuditPayload = Record<string, unknown>;

function normalizeEntityId(value: string | null | undefined) {
  if (!value) return null;
  return UUID_RE.test(value) ? value : null;
}

export async function logAdminAction({
  action,
  entityType,
  entityId,
  payload = {},
}: {
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: AuditPayload;
}): Promise<void> {
  const sessionClient = await createSsrClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  const role = await currentAdminRole();
  if (!user || !role) return;

  const normalizedEntityId = normalizeEntityId(entityId);
  const finalPayload =
    normalizedEntityId === null && entityId
      ? { ...payload, raw_entity_id: entityId }
      : payload;

  const supabase = createAdminClient();
  const { error } = await supabase.from("admin_logs").insert({
    actor_id: user.id,
    actor_role: role,
    action,
    entity_type: entityType,
    entity_id: normalizedEntityId,
    payload: finalPayload,
  } as never);

  if (error) {
    console.error("[logAdminAction] failed:", error);
  }
}
