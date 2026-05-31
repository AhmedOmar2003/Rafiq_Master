import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Centralized user-directory access for the dashboard.
 *
 * Why this file exists
 * --------------------
 * Every dashboard page used to call `supabase.auth.admin.listUsers()`
 * directly. That has TWO problems:
 *
 *   1. CORRECTNESS — `listUsers()` defaults to a single page of 50 users.
 *      With 51+ accounts the 51st simply vanished from every screen. The
 *      paginated loop here fetches *all* users so counts and joins are
 *      truthful at any scale.
 *
 *   2. PERFORMANCE — most pages only need a {id → name/email} lookup to
 *      enrich a row (e.g. "which provider owns this place"). For that we
 *      read the indexed `profiles` table instead of hammering the auth
 *      admin API. The auth list is only fetched when a page genuinely
 *      needs the canonical account roster (the Users page).
 *
 * Both helpers are wrapped in React's `cache()` so that within a single
 * server render they run at most once, even if multiple components ask.
 */

export type DirectoryUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  createdAt: string;
};

/**
 * Lightweight {id → profile} map sourced from the indexed `profiles` table.
 * This is the fast path used by Places / Activity / Reports / Overview to
 * resolve owner names + emails without touching the auth admin API.
 *
 * O(1) lookups, one indexed SELECT, cached per request.
 */
export const getProfileDirectory = cache(async (): Promise<
  Map<string, DirectoryUser>
> => {
  const supabase = createAdminClient();
  const map = new Map<string, DirectoryUser>();

  // Page through profiles in chunks so a huge table never blows the
  // statement memory or the default 1000-row PostgREST cap.
  const pageSize = 1000;
  let from = 0;
  // Hard ceiling so a pathological dataset can't spin forever.
  for (let guard = 0; guard < 1000; guard++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("[getProfileDirectory] error:", error.message);
      break;
    }
    const rows = (data ?? []) as {
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
      created_at: string;
    }[];
    for (const r of rows) {
      map.set(r.id, {
        id: r.id,
        email: r.email,
        fullName: r.full_name,
        phone: r.phone,
        createdAt: r.created_at,
      });
    }
    if (rows.length < pageSize) break; // last page
    from += pageSize;
  }

  return map;
});

/**
 * Full auth roster — every account in `auth.users`, paginated.
 * Use ONLY on the Users page where the canonical list matters (including
 * accounts that for some reason lack a profile row). Everywhere else,
 * prefer getProfileDirectory().
 */
export const listAllAuthUsers = cache(async (): Promise<DirectoryUser[]> => {
  const supabase = createAdminClient();
  const out: DirectoryUser[] = [];

  const perPage = 1000; // Supabase admin API max
  let page = 1;
  for (let guard = 0; guard < 1000; guard++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      console.error("[listAllAuthUsers] error:", error.message);
      break;
    }
    const users = data?.users ?? [];
    for (const u of users) {
      const meta = (u.user_metadata ?? {}) as {
        full_name?: string;
        name?: string;
      };
      out.push({
        id: u.id,
        email: u.email ?? null,
        fullName: meta.full_name ?? meta.name ?? null,
        phone: (u.phone as string | undefined) ?? null,
        createdAt: u.created_at,
      });
    }
    if (users.length < perPage) break; // last page
    page += 1;
  }

  return out;
});
