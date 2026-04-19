import { createAdminClient } from "@/lib/supabase/admin";
import { Users, UserCheck, Shield } from "lucide-react";
import s from "../shared.module.css";
import UsersFilters from "./UsersFilters";

export const metadata = { title: "إدارة المستخدمين - رفيق" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdminRoleRow = { user_id: string; role: "admin" | "super_admin" };

export default async function UsersPage() {
  const supabase = createAdminClient();

  const [{ data: authUsers, error }, { data: adminRoles }] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase.from("admin_roles").select("user_id, role"),
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

  const roleMap = new Map(
    ((adminRoles ?? []) as AdminRoleRow[]).map((r) => [r.user_id, r.role])
  );

  const users = (authUsers?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    user_metadata: u.user_metadata as { full_name?: string; name?: string },
    role: roleMap.get(u.id) ?? null,
  }));

  const total = users.length;
  const admins = users.filter((u) => u.role).length;
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
