import "server-only";
import { redirect } from "next/navigation";
import { createClient as createSsrClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminRole = "admin" | "super_admin";

/**
 * Authorization matrix for the dashboard.
 *
 * Every page route in /dashboard maps to either:
 *   - any admin   → both 'admin' and 'super_admin' can see it
 *   - super only  → only 'super_admin' (the platform owner) can see it
 *
 * Rule of thumb: anything that touches money, user identity, or platform
 * configuration is super-admin only. Day-to-day moderation work is open
 * to regular admins.
 */
export const SUPER_ADMIN_ONLY = new Set<string>([
  "users",          // creating/deleting accounts → identity surface
  "subscriptions",  // revenue + billing
  "settings",       // global platform config
]);

/**
 * Resolve the currently-authenticated admin's role.
 * Returns null if not logged in or not an admin at all.
 *
 * Used by:
 *   - the sidebar to hide menu items
 *   - per-page guards (requireSuperAdmin)
 *   - the Add User modal to gate role choices
 */
export async function currentAdminRole(): Promise<AdminRole | null> {
  const supabase = await createSsrClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // We hit the table via the admin client because admin_roles is owned by
  // service-role; the SSR client doesn't have a SELECT policy on it.
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const role = (data as { role: AdminRole } | null)?.role;
  return role ?? null;
}

/**
 * Hard-block any page that should not be visible to regular admins.
 * Call this at the top of a server component's render.
 */
export async function requireSuperAdmin(): Promise<void> {
  const role = await currentAdminRole();
  if (role !== "super_admin") {
    redirect("/unauthorized");
  }
}

/**
 * For "soft" checks where we want to render a friendlier message instead
 * of a hard redirect (e.g. hide a button vs hide an entire page).
 */
export function canAccessSection(role: AdminRole | null, section: string): boolean {
  if (role === "super_admin") return true;
  if (role === "admin") return !SUPER_ADMIN_ONLY.has(section);
  return false;
}
