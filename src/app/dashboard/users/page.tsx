import { createAdminClient } from "@/lib/supabase/admin";
import { Users, UserCheck, Shield, Store } from "lucide-react";
import s from "../shared.module.css";
import UsersFilters from "./UsersFilters";

export const metadata = { title: "إدارة المستخدمين - رفيق" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdminRoleRow = { user_id: string; role: "admin" | "super_admin" };
type ProviderOwnerRow = { owner_id: string };

export default async function UsersPage() {
  const supabase = createAdminClient();

  // Three parallel reads:
  //   - auth.users      → the canonical account list (email, created_at, metadata)
  //   - admin_roles     → dashboard moderation roles (admin / super_admin)
  //   - providers       → AUTHORITATIVE provider list. The `user_roles` table
  //                        gets a 'provider' entry the moment somebody taps
  //                        "Become a provider", but that doesn't mean they
  //                        actually finished onboarding. The `providers` row
  //                        only exists after `become_provider()` succeeded
  //                        AND the user committed a business name, so it's
  //                        the single source of truth the admin should see.
  //                        A "regular user" is just an authenticated account
  //                        with NO providers row.
  const [
    { data: authUsers, error },
    { data: adminRoles },
    { data: providerRows },
  ] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase.from("admin_roles").select("user_id, role"),
    supabase.from("providers").select("owner_id"),
  ]);

  if (error) {
    return (
      <div className={s.page}>
        <p style={{ color: "var(--color-danger)" }}>
          تعذر تحميل المستخدمين: {error.message}
        </p>
      </div>
    );
  }

  const adminMap = new Map(
    ((adminRoles ?? []) as AdminRoleRow[]).map((r) => [r.user_id, r.role])
  );
  const providerSet = new Set(
    ((providerRows ?? []) as ProviderOwnerRow[]).map((r) => r.owner_id)
  );

  const users = (authUsers?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    user_metadata: u.user_metadata as { full_name?: string; name?: string },
    role: adminMap.get(u.id) ?? null,
    isProvider: providerSet.has(u.id),
  }));

  const total = users.length;
  const admins = users.filter((u) => u.role).length;
  const providers = users.filter((u) => u.isProvider).length;
  const regular = users.filter((u) => !u.isProvider && !u.role).length;
  const thisMonth = users.filter((u) => {
    const d = new Date(u.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <div className={s.pageBreadcrumb}>
            لوحة التحكم <span>/</span> المستخدمين
          </div>
          <h1 className={s.pageTitle}>إدارة المستخدمين</h1>
          <p className={s.pageSubtitle}>
            متابعة حسابات المستخدمين وأدوار الإدارة
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: "rgba(104,31,0,0.10)", color: "#681F00" }}>
            <Users size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{total}</div>
            <div className={s.statLabel}>إجمالي المستخدمين</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: "rgba(139,92,246,0.12)", color: "#7c3aed" }}>
            <Shield size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{admins}</div>
            <div className={s.statLabel}>المشرفون</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: "rgba(59,130,246,0.12)", color: "#2563eb" }}>
            <Store size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{providers}</div>
            <div className={s.statLabel}>مقدّمو الخدمة</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: "rgba(20,184,166,0.12)", color: "#0d9488" }}>
            <UserCheck size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{regular}</div>
            <div className={s.statLabel}>مستخدم عادي</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
            <UserCheck size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{thisMonth}</div>
            <div className={s.statLabel}>مسجلون هذا الشهر</div>
          </div>
        </div>
      </div>

      {/* Filters + Table */}
      <UsersFilters users={users} />
    </div>
  );
}
