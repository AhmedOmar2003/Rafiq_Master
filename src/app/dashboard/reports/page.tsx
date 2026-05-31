import { createAdminClient } from "@/lib/supabase/admin";
import { ShieldAlert, Hourglass, CheckCircle2, XCircle } from "lucide-react";
import s from "../shared.module.css";
import ReportsList, { type ReportRow } from "./ReportsList";
import { setReportStatus } from "./actions";
import { getProfileDirectory, listAllAuthUsers } from "@/lib/admin/users";

export const metadata = { title: "البلاغات - رفيق" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RawReport = {
  id: string;
  reporter_id: string | null;
  target_type: "place" | "review" | "provider" | "user";
  target_id: string;
  reason_code: string;
  details: string | null;
  status: "open" | "reviewed" | "actioned" | "dismissed";
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
};

export default async function ReportsPage() {
  const supabase = createAdminClient();

  const [reportsRes, placesRes, dirRes, authUsersRes, providerRowsRes, subsRes] =
    await Promise.allSettled([
    supabase
      .from("moderation_reports")
      .select("id,reporter_id,target_type,target_id,reason_code,details,status,resolution_note,resolved_at,created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("places").select("id,place_name"),
    getProfileDirectory(),
    listAllAuthUsers(),
    supabase.from("providers").select("id, owner_id"),
    supabase
      .from("provider_subscriptions")
      .select("provider_id")
      .in("status", ["active", "trialing", "past_due"]),
    ]);

  const rawReports =
    reportsRes.status === "fulfilled" ? (reportsRes.value.data ?? []) : [];
  const rawPlaces =
    placesRes.status === "fulfilled" ? (placesRes.value.data ?? []) : [];

  const placeByUuid = new Map<string, string>();
  for (const p of rawPlaces as { id: string; place_name: string | null }[]) {
    placeByUuid.set(p.id, p.place_name ?? "—");
  }

  const userByUuid = new Map<string, string>();
  const emailByUuid = new Map<string, string | null>();
  if (dirRes.status === "fulfilled") {
    for (const [id, u] of dirRes.value) {
      userByUuid.set(id, u.fullName ?? u.email?.split("@")[0] ?? "بدون اسم");
      emailByUuid.set(id, u.email);
    }
  }
  if (authUsersRes.status === "fulfilled") {
    for (const user of authUsersRes.value) {
      if (!userByUuid.has(user.id)) {
        userByUuid.set(
          user.id,
          user.fullName ?? user.email?.split("@")[0] ?? "بدون اسم",
        );
      }
      if (!emailByUuid.get(user.id)) {
        emailByUuid.set(user.id, user.email);
      }
    }
  }

  const activeProviderIds = new Set(
    subsRes.status === "fulfilled"
      ? ((subsRes.value.data ?? []) as { provider_id: string }[]).map(
          (row) => row.provider_id,
        )
      : [],
  );
  const providerOwnerIds = new Set(
    providerRowsRes.status === "fulfilled"
      ? ((providerRowsRes.value.data ?? []) as {
          id: string;
          owner_id: string | null;
        }[])
          .filter((row) => row.owner_id && activeProviderIds.has(row.id))
          .map((row) => row.owner_id as string)
      : [],
  );

  const reports: ReportRow[] = (rawReports as RawReport[]).map((r) => ({
    id: r.id,
    reporterName: r.reporter_id ? userByUuid.get(r.reporter_id) ?? "بدون اسم" : "—",
    reporterEmail: r.reporter_id ? emailByUuid.get(r.reporter_id) ?? null : null,
    reporterKind: r.reporter_id
      ? providerOwnerIds.has(r.reporter_id)
        ? "provider_user"
        : "regular_user"
      : "unknown",
    targetType: r.target_type,
    targetId: r.target_id,
    targetName:
      r.target_type === "place"
        ? placeByUuid.get(r.target_id) ?? r.target_id.slice(0, 8)
        : r.target_id.slice(0, 8),
    reasonCode: r.reason_code,
    details: r.details,
    status: r.status,
    resolutionNote: r.resolution_note,
    resolvedAt: r.resolved_at,
    createdAt: r.created_at,
  }));

  const totals = {
    all: reports.length,
    open: reports.filter((r) => r.status === "open").length,
    reviewed: reports.filter((r) => r.status === "reviewed").length,
    actioned: reports.filter((r) => r.status === "actioned").length,
    dismissed: reports.filter((r) => r.status === "dismissed").length,
  };

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <div className={s.pageBreadcrumb}>
            لوحة التحكم <span>/</span> البلاغات
          </div>
          <h1 className={s.pageTitle}>بلاغات المستخدمين</h1>
          <p className={s.pageSubtitle}>
            بلاغات عن محتوى مسيء، spam، أو معلومات غير دقيقة. راجع كل بلاغ، خد إجراء، واترك ملاحظة.
          </p>
        </div>
      </div>

      <div className={s.statsRow}>
        <Kpi icon={<ShieldAlert size={22} />} value={totals.all} label="إجمالي البلاغات" tone="#681F00" />
        <Kpi icon={<Hourglass size={22} />} value={totals.open} label="مفتوح" tone="#d97706" />
        <Kpi icon={<CheckCircle2 size={22} />} value={totals.actioned} label="تم اتخاذ إجراء" tone="#10b981" />
        <Kpi icon={<XCircle size={22} />} value={totals.dismissed} label="مرفوض" tone="#6b7280" />
      </div>

      <ReportsList reports={reports} setStatusAction={setReportStatus} />
    </div>
  );
}

function Kpi({
  icon, value, label, tone,
}: {
  icon: React.ReactNode; value: number; label: string; tone: string;
}) {
  return (
    <div className={s.statCard}>
      <div className={s.statIcon} style={{ background: `${tone}1A`, color: tone }}>
        {icon}
      </div>
      <div className={s.statBody}>
        <div className={s.statValue}>{value}</div>
        <div className={s.statLabel}>{label}</div>
      </div>
    </div>
  );
}
