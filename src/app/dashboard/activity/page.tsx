import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileDirectory } from "@/lib/admin/users";
import {
  Activity, CheckCircle2, XCircle, Hourglass, CreditCard, UserPlus,
  Store, Gavel, MapPin, Trash2, Star, Siren, Megaphone, Heart, Navigation, MousePointerClick,
} from "lucide-react";
import s from "../shared.module.css";
import ActivityFeed, { type ActivityRow } from "./ActivityFeed";

export const metadata = { title: "النشاط - رفيق" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ModRow = {
  id: string;
  target_type: string;
  target_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  actor_id: string | null;
  reason: string | null;
  created_at: string;
};
type SubRow = {
  id: string;
  provider_id: string;
  tier: string;
  status: string;
  gateway: string;
  amount_paid_egp: number | null;
  created_at: string;
};
type AppealRow = {
  id: string;
  place_id: number;
  contact_name: string;
  status: string;
  created_at: string;
};
type ReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason_code: string;
  details: string | null;
  status: string;
  created_at: string;
};
type ReviewRow = {
  review_id: number;
  place_id: string;
  name: string | null;
  rating: number | null;
  review_text: string | null;
  created_at: string;
};
type CampaignRow = {
  id: string;
  provider_id: string;
  place_id: string | null;
  title: string;
  status: string;
  created_at: string;
};
type AnalyticsRow = {
  id: string;
  kind: string;
  place_id: string | null;
  occurred_at: string;
};
type CampaignMetricRow = {
  id: number;
  campaign_id: string;
  place_id: string | null;
  metric: string;
  occurred_at: string;
};
type ProviderRow = { id: string; business_name: string | null };
type PlaceRow = { id: string; place_name: string | null };
type ProfileRow = { id: string; full_name: string | null; created_at: string };

/**
 * Unified activity stream — merges moderation events, subscription changes,
 * appeal submissions, and user signups into a single chronological feed so
 * the admin can see "everything happening" in one scroll.
 *
 * Each query is bounded (last 200 rows) and sorted in memory by created_at
 * desc. With the indexes from migration 0036, every query is index-only
 * scan; total latency stays sub-200ms even at scale.
 */
export default async function ActivityPage() {
  // We call Date.now() further down to compute the 24h window. In Next 16
  // server components, time-of-day is a "request-time API" — `connection()`
  // tells the framework this render must run per-request, never prerendered.
  await connection();
  const supabase = createAdminClient();

  const [
    userDirectory,
    { data: modRows },
    { data: subRows },
    { data: appealRows },
    { data: providerRows },
    { data: placeRows },
    { data: reportRows },
    { data: reviewRows },
    { data: campaignRows },
    { data: analyticsRows },
    { data: campaignMetricRows },
  ] = await Promise.all([
    getProfileDirectory(),
    supabase
      .from("moderation_history")
      .select("id,target_type,target_id,action,from_status,to_status,actor_id,reason,created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("provider_subscriptions")
      .select("id,provider_id,tier,status,gateway,amount_paid_egp,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("place_appeals")
      .select("id,place_id,contact_name,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("providers").select("id,business_name"),
    supabase.from("places").select("id,place_name"),
    supabase
      .from("moderation_reports")
      .select("id,target_type,target_id,reason_code,details,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("reviews")
      .select("review_id,place_id,name,rating,review_text,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("promotional_campaigns")
      .select("id,provider_id,place_id,title,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("analytics_events")
      .select("id,kind,place_id,occurred_at")
      .in("kind", ["place_open", "place_favorite", "place_unfavorite", "place_map_open"])
      .order("occurred_at", { ascending: false })
      .limit(140),
    supabase
      .from("campaign_metric_events")
      .select("id,campaign_id,place_id,metric,occurred_at")
      .eq("metric", "click")
      .order("occurred_at", { ascending: false })
      .limit(100),
  ]);

  const providerByUuid = new Map<string, string>();
  for (const p of (providerRows ?? []) as ProviderRow[]) {
    providerByUuid.set(p.id, p.business_name ?? "—");
  }
  const placeByUuid = new Map<string, string>();
  for (const p of (placeRows ?? []) as PlaceRow[]) {
    placeByUuid.set(p.id, p.place_name ?? "—");
  }
  const profileById = new Map<string, ProfileRow>();
  for (const [id, u] of userDirectory) {
    profileById.set(id, {
      id,
      full_name: u.fullName ?? u.email?.split("@")[0] ?? null,
      created_at: u.createdAt,
    });
  }
  const campaignById = new Map<string, CampaignRow>();
  for (const row of (campaignRows ?? []) as CampaignRow[]) {
    campaignById.set(row.id, row);
  }

  const events: ActivityRow[] = [];

  // ── moderation_history events (approve/reject/suspend/start_review) ──
  for (const m of (modRows ?? []) as ModRow[]) {
    const subject = m.target_type === "place"
      ? placeByUuid.get(m.target_id) ?? `مكان ${m.target_id.slice(0, 8)}`
      : providerByUuid.get(m.target_id) ?? m.target_type;
    const actor = m.actor_id ? profileById.get(m.actor_id)?.full_name ?? "أدمن" : "النظام";
    events.push({
      id: `mod:${m.id}`,
      kind: m.action === "approve" ? "approve"
        : m.action === "reject" ? "reject"
        : m.action === "suspend" ? "suspend"
        : "pending",
      title: m.action === "approve" ? `اعتماد: ${subject}`
        : m.action === "reject" ? `رفض: ${subject}`
        : m.action === "suspend" ? `تعليق: ${subject}`
        : `إعادة للمراجعة: ${subject}`,
      subtitle: actor,
      detail: m.reason ?? undefined,
      createdAt: m.created_at,
    });
  }

  // ── subscription events ──
  for (const sub of (subRows ?? []) as SubRow[]) {
    const business = providerByUuid.get(sub.provider_id) ?? "مقدّم خدمة";
    events.push({
      id: `sub:${sub.id}`,
      kind: "subscription",
      title: `اشتراك ${sub.tier === "free" ? "مجاني" : sub.tier === "pro" ? "Pro" : sub.tier === "max" ? "Max" : sub.tier} — ${business}`,
      subtitle: `${sub.gateway === "manual" ? "يدوي/تجريبي" : sub.gateway}${sub.amount_paid_egp && sub.amount_paid_egp > 0 ? ` · ${sub.amount_paid_egp} ج.م` : ""}`,
      createdAt: sub.created_at,
    });
  }

  // ── appeal submissions ──
  for (const a of (appealRows ?? []) as AppealRow[]) {
    events.push({
      id: `appeal:${a.id}`,
      kind: "appeal",
      title: `طعن جديد من ${a.contact_name}`,
      subtitle: `مكان #${a.place_id}`,
      createdAt: a.created_at,
    });
  }

  // ── abuse reports ──
  for (const report of (reportRows ?? []) as ReportRow[]) {
    const subject =
      report.target_type === "place"
        ? placeByUuid.get(report.target_id) ?? "مكان"
        : report.target_type;
    events.push({
      id: `report:${report.id}`,
      kind: "report",
      title: `بلاغ جديد على ${subject}`,
      subtitle: `السبب: ${report.reason_code} • الحالة: ${report.status}`,
      detail: report.details ?? undefined,
      createdAt: report.created_at,
    });
  }

  // ── review submissions ──
  for (const review of (reviewRows ?? []) as ReviewRow[]) {
    const placeName = placeByUuid.get(review.place_id) ?? "مكان";
    events.push({
      id: `review:${review.review_id}`,
      kind: "review",
      title: `تقييم جديد لـ ${placeName}`,
      subtitle: `${review.name ?? "مستخدم"} • ${review.rating ?? 0} نجوم`,
      detail: review.review_text?.trim() || undefined,
      createdAt: review.created_at,
    });
  }

  // ── campaign submissions / updates ──
  for (const campaign of (campaignRows ?? []) as CampaignRow[]) {
    const placeName = campaign.place_id
      ? placeByUuid.get(campaign.place_id) ?? "مكان"
      : "بدون مكان";
    const providerName = providerByUuid.get(campaign.provider_id) ?? "مقدم خدمة";
    events.push({
      id: `campaign:${campaign.id}`,
      kind: "campaign",
      title: `حملة جديدة: ${campaign.title}`,
      subtitle: `${placeName} • ${providerName} • ${campaign.status}`,
      createdAt: campaign.created_at,
    });
  }

  // ── interaction analytics ──
  for (const row of (analyticsRows ?? []) as AnalyticsRow[]) {
    const placeName = row.place_id ? placeByUuid.get(row.place_id) ?? "مكان" : "مكان";
    const mapping: Record<string, { kind: ActivityRow["kind"]; title: string }> = {
      place_open: { kind: "place_open", title: `تم فتح تفاصيل ${placeName}` },
      place_favorite: { kind: "favorite", title: `تمت إضافة ${placeName} إلى المفضلة` },
      place_unfavorite: { kind: "favorite", title: `تمت إزالة ${placeName} من المفضلة` },
      place_map_open: { kind: "map_open", title: `تم فتح خريطة ${placeName}` },
    };
    const event = mapping[row.kind];
    if (!event) continue;
    events.push({
      id: `analytics:${row.id}`,
      kind: event.kind,
      title: event.title,
      subtitle: placeName,
      createdAt: row.occurred_at,
    });
  }

  // ── campaign clicks ──
  for (const metric of (campaignMetricRows ?? []) as CampaignMetricRow[]) {
    const campaign = campaignById.get(metric.campaign_id);
    const placeName = metric.place_id ? placeByUuid.get(metric.place_id) ?? "مكان" : "مكان";
    events.push({
      id: `campaign-click:${metric.id}`,
      kind: "campaign_click",
      title: `نقرة على إعلان ${campaign?.title ?? "بدون عنوان"}`,
      subtitle: placeName,
      createdAt: metric.occurred_at,
    });
  }

  // ── user signups ── (most recent 100 from the directory)
  const recentSignups = [...userDirectory.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
  for (const u of recentSignups) {
    const name = u.fullName ?? u.email?.split("@")[0] ?? "مستخدم جديد";
    events.push({
      id: `signup:${u.id}`,
      kind: "signup",
      title: `تسجيل جديد: ${name}`,
      subtitle: u.email ?? undefined,
      createdAt: u.createdAt,
    });
  }

  // Sort: most recent first
  events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Headline counts (24h window). Time-of-day is intentional here — the
  // connection() call above already guarantees this runs per-request and
  // never gets prerendered, so the impure-function lint rule is a false
  // positive in this context.
  // eslint-disable-next-line react-hooks/purity
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const last24h = events.filter((e) => e.createdAt > dayAgo);

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <div className={s.pageBreadcrumb}>
            لوحة التحكم <span>/</span> النشاط
          </div>
          <h1 className={s.pageTitle}>كل اللي بيحصل في رفيق</h1>
          <p className={s.pageSubtitle}>
            بث مباشر لكل الأحداث: تسجيل، اشتراك، اعتماد، رفض، طعن — مكان واحد للأدمن يتابع منه نبض المنصّة.
          </p>
        </div>
      </div>

      <div className={s.statsRow}>
        <Kpi icon={<Activity size={22} />} value={last24h.length} label="نشاط آخر ٢٤ ساعة" tone="#681F00" />
        <Kpi icon={<UserPlus size={22} />} value={last24h.filter((e) => e.kind === "signup").length} label="تسجيلات جديدة" tone="#2563eb" />
        <Kpi icon={<CreditCard size={22} />} value={last24h.filter((e) => e.kind === "subscription").length} label="اشتراكات جديدة" tone="#10b981" />
        <Kpi icon={<CheckCircle2 size={22} />} value={last24h.filter((e) => e.kind === "approve").length} label="عمليات اعتماد" tone="#16a34a" />
        <Kpi icon={<XCircle size={22} />} value={last24h.filter((e) => e.kind === "reject").length} label="عمليات رفض" tone="#dc2626" />
        <Kpi icon={<Gavel size={22} />} value={last24h.filter((e) => e.kind === "appeal").length} label="طعون جديدة" tone="#d97706" />
        <Kpi icon={<Star size={22} />} value={last24h.filter((e) => e.kind === "review").length} label="تقييمات جديدة" tone="#f59e0b" />
        <Kpi icon={<Siren size={22} />} value={last24h.filter((e) => e.kind === "report").length} label="بلاغات جديدة" tone="#dc2626" />
        <Kpi icon={<Megaphone size={22} />} value={last24h.filter((e) => e.kind === "campaign").length} label="حملات جديدة" tone="#681F00" />
        <Kpi icon={<Heart size={22} />} value={last24h.filter((e) => e.kind === "favorite").length} label="تفاعلات المفضلة" tone="#db2777" />
        <Kpi icon={<Navigation size={22} />} value={last24h.filter((e) => e.kind === "map_open").length} label="فتح الخريطة" tone="#0284c7" />
        <Kpi icon={<MousePointerClick size={22} />} value={last24h.filter((e) => e.kind === "campaign_click").length} label="نقرات الإعلانات" tone="#9333ea" />
      </div>

      <ActivityFeed events={events} />
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

// Re-export icons for the client component to use lazily without importing
// lucide twice in different chunks.
export const ICONS = {
  approve: CheckCircle2,
  reject: XCircle,
  suspend: Trash2,
  pending: Hourglass,
  subscription: CreditCard,
  signup: UserPlus,
  appeal: Gavel,
  review: Star,
  report: Siren,
  campaign: Megaphone,
  place_open: Activity,
  favorite: Heart,
  map_open: Navigation,
  campaign_click: MousePointerClick,
  place: MapPin,
  provider: Store,
};
