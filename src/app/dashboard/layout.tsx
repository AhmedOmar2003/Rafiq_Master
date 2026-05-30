import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentAdminRole } from "@/lib/auth/role";
import DashboardChrome from "./DashboardChrome";

/**
 * Server-side wrapper for the dashboard chrome.
 *
 * Resolves the logged-in admin's display name + role once per request and
 * passes them down to the (client) sidebar/topbar. That lets the sidebar
 * hide super-admin-only entries without ever rendering them in the
 * markup — a regular admin never sees a forbidden link they'd then bounce
 * off of, and the role badge in the corner is always accurate.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth: the proxy middleware already enforces "must be an
  // admin to see anything under /dashboard". If somehow that's bypassed
  // (CDN cache mishap, etc) we still bounce.
  const role = await currentAdminRole();
  if (!role) redirect("/unauthorized");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const meta = (user?.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
  };
  const displayName =
    meta.full_name ?? meta.name ?? user?.email?.split("@")[0] ?? "Admin";

  return (
    <DashboardChrome role={role} displayName={displayName}>
      {children}
    </DashboardChrome>
  );
}
