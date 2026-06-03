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

const RANGE_OPTIONS = [1, 7, 14, 30, 90] as const;

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
  updated_at: string;
  edit_request_status: string | null;
  edit_request_response: string | null;
  edit_request_requested_at: string | null;
  edit_request_reviewed_at: string | null;
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
type AdminLogRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};
type ProviderRow = { id: string; business_name: string | null };
type PlaceRow = { id: string; place_name: string | null };
type ProfileRow = { id: string; full_name: string | null; created_at: string };
type ProviderEventRow = {
  id: string;
  owner_id: string | null;
  business_name: string | null;
  status: string | null;
  created_at: string;
};
type PlaceEventRow = {
  id: string;
  provider_id: string | null;
  place_id: number;
  place_name: string | null;
  status: string | null;
  created_at: string;
};

function parseRange(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return RANGE_OPTIONS.includes(parsed as (typeof RANGE_OPTIONS)[number]) ? parsed : 7;
}

function rangeHref(days: number) {
  return `/dashboard/activity?range=${days}`;
}

function stringPayloadValue(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  return typeof value === "string" ? value : null;
}

function numberPayloadValue(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  return typeof value === "number" ? value : null;
}

/**
 * Unified activity stream — merges moderation, subscriptions, reports,
 * campaigns, and real interaction analytics into one admin timeline.
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string | string[] }>;
}) {
  const params = await searchParams;
  await connection();
  const supabase = createAdminClient();
  const rangeDays = parseRange(params?.range);
  // eslint-disable-next-line react-hooks/purity
  const sinceIso = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

  const [
    userDirectory,
    { data: modRows },
    { data: subRows },
    { data: appealRows },
    { data: providerRows },
    { data: placeRows },
    { data: recentProviderRows },
    { data: recentPlaceRows },
    { data: reportRows },
    { data: reviewRows },
    { data: campaignRows },
    { data: analyticsRows },
    { data: campaignMetricRows },
    { data: adminLogRows },
  ] = await Promise.all([
    getProfileDirectory(),
    supabase
      .from("moderation_history")
      .select("id,target_type,target_id,action,from_status,to_status,actor_id,reason,created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("provider_subscriptions")
      .select("id,provider_id,tier,status,gateway,amount_paid_egp,created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("place_appeals")
      .select("id,place_id,contact_name,status,created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("providers").select("id,business_name"),
    supabase.from("places").select("id,place_name"),
    supabase
      .from("providers")
      .select("id,owner_id,business_name,status,created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("places")
      .select("id,provider_id,place_id,place_name,status,created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("moderation_reports")
      .select("id,target_type,target_id,reason_code,details,status,created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("reviews")
      .select("review_id,place_id,name,rating,review_text,created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("promotional_campaigns")
      .select("id,provider_id,place_id,title,status,created_at,updated_at,edit_request_status,edit_request_response,edit_request_requested_at,edit_request_reviewed_at")
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("analytics_events")
      .select("id,kind,place_id,occurred_at")
      .in("kind", ["place_open", "place_favorite", "place_unfavorite", "place_map_open"])
      .gte("occurred_at", sinceIso)
      .order("occurred_at", { ascending: false })
      .limit(140),
    supabase
      .from("campaign_metric_events")
      .select("id,campaign_id,place_id,metric,occurred_at")
      .in("metric", ["click", "impression"])
      .gte("occurred_at", sinceIso)
      .order("occurred_at", { ascending: false })
      .limit(160),
    supabase
      .from("admin_logs")
      .select("id,actor_id,actor_role,action,entity_type,entity_id,payload,created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(250),
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

  // ── provider onboarding / becoming provider ──
  for (const provider of (recentProviderRows ?? []) as ProviderEventRow[]) {
    const owner = provider.owner_id
      ? profileById.get(provider.owner_id)?.full_name ?? "مستخدم"
      : "مستخدم";
    events.push({
      id: `provider-created:${provider.id}`,
      kind: "signup",
      title: `تحوّل إلى مقدم خدمة: ${provider.business_name ?? owner}`,
      subtitle: `${owner} • ${provider.status ?? "active"}`,
      createdAt: provider.created_at,
    });
  }

  // ── place submissions / new listings ──
  for (const place of (recentPlaceRows ?? []) as PlaceEventRow[]) {
    const isProviderSubmission = !!place.provider_id;
    if (!isProviderSubmission) continue;
    const providerName = providerByUuid.get(place.provider_id!) ?? "مقدم خدمة";
    events.push({
      id: `place-created:${place.id}`,
      kind: "pending",
      title: `مكان جديد قيد المراجعة: ${place.place_name ?? "مكان"}`,
      subtitle: `${providerName} • ${place.status ?? "pending"}`,
      createdAt: place.created_at,
    });
  }

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
    if (campaign.edit_request_status === "pending" && campaign.edit_request_requested_at) {
      events.push({
        id: `campaign-edit-request:${campaign.id}`,
        kind: "campaign",
        title: `طلب تعديل إعلان: ${campaign.title}`,
        subtitle: `${placeName} • ${providerName}`,
        createdAt: campaign.edit_request_requested_at,
      });
    }
    if (campaign.edit_request_status === "approved" && campaign.edit_request_reviewed_at) {
      events.push({
        id: `campaign-edit-approved:${campaign.id}`,
        kind: "approve",
        title: `تم فتح تعديل إعلان: ${campaign.title}`,
        subtitle: `${placeName} • ${providerName}`,
        detail: campaign.edit_request_response?.trim() || undefined,
        createdAt: campaign.edit_request_reviewed_at,
      });
    }
    if (campaign.edit_request_status === "rejected" && campaign.edit_request_reviewed_at) {
      events.push({
        id: `campaign-edit-rejected:${campaign.id}`,
        kind: "reject",
        title: `تم رفض طلب تعديل إعلان: ${campaign.title}`,
        subtitle: `${placeName} • ${providerName}`,
        detail: campaign.edit_request_response?.trim() || undefined,
        createdAt: campaign.edit_request_reviewed_at,
      });
    }
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
      kind: metric.metric === "impression" ? "campaign_impression" : "campaign_click",
      title:
        metric.metric === "impression"
          ? `ظهر إعلان ${campaign?.title ?? "بدون عنوان"} للمستخدم`
          : `نقرة على إعلان ${campaign?.title ?? "بدون عنوان"}`,
      subtitle: placeName,
      createdAt: metric.occurred_at,
    });
  }

  // ── admin dashboard / privileged actions ──
  for (const log of (adminLogRows ?? []) as AdminLogRow[]) {
    const actor = log.actor_id
      ? profileById.get(log.actor_id)?.full_name ?? "أدمن"
      : "النظام";
    const payload = log.payload ?? {};
    const entityPlaceName = stringPayloadValue(payload, "place_name");
    const entityTitle = stringPayloadValue(payload, "title");
    const entityEmail = stringPayloadValue(payload, "email");
    const businessName = stringPayloadValue(payload, "business_name");

    const mapping: Record<string, Omit<ActivityRow, "id" | "createdAt">> = {
      create_place: {
        kind: "admin_action",
        title: `الأدمن أضاف مكانًا: ${entityPlaceName ?? "مكان"}`,
        subtitle: actor,
      },
      update_place: {
        kind: "admin_action",
        title: `الأدمن عدّل مكانًا: ${entityPlaceName ?? "مكان"}`,
        subtitle: actor,
      },
      delete_place: {
        kind: "admin_action",
        title: `الأدمن حذف مكانًا: ${entityPlaceName ?? "مكان"}`,
        subtitle: actor,
      },
      set_place_status: {
        kind:
          stringPayloadValue(payload, "to_status") === "approved"
            ? "approve"
            : stringPayloadValue(payload, "to_status") === "rejected"
              ? "reject"
              : stringPayloadValue(payload, "to_status") === "suspended"
                ? "suspend"
                : "pending",
        title: `الأدمن غيّر حالة مكان: ${entityPlaceName ?? "مكان"}`,
        subtitle: actor,
        detail: `من ${stringPayloadValue(payload, "from_status") ?? "—"} إلى ${stringPayloadValue(payload, "to_status") ?? "—"}`,
      },
      set_place_edit_allowed: {
        kind: "admin_action",
        title: `الأدمن حدّث صلاحية تعديل مكان: ${entityPlaceName ?? "مكان"}`,
        subtitle: actor,
        detail: (payload.allow_edit === true || payload.allow_edit === "true")
          ? "فتح التعديل للمزوّد"
          : "أغلق التعديل للمزوّد",
      },
      create_user: {
        kind: "admin_action",
        title: `الأدمن أنشأ حسابًا جديدًا`,
        subtitle: `${actor} • ${entityEmail ?? "بدون إيميل"}`,
        detail: `الدور: ${stringPayloadValue(payload, "role") ?? "user"}${businessName ? ` • النشاط: ${businessName}` : ""}`,
      },
      delete_user: {
        kind: "admin_action",
        title: `الأدمن حذف حسابًا نهائيًا`,
        subtitle: actor,
        detail: stringPayloadValue(payload, "admin_role")
          ? `نوع الحساب: ${stringPayloadValue(payload, "admin_role")}`
          : undefined,
      },
      set_admin_role: {
        kind: "admin_action",
        title: `الأدمن حدّث صلاحيات حساب إداري`,
        subtitle: actor,
        detail: `الدور الجديد: ${stringPayloadValue(payload, "role") ?? "بدون صلاحية"}`,
      },
      approve_campaign: {
        kind: "approve",
        title: `اعتماد إعلان: ${entityTitle ?? "إعلان"}`,
        subtitle: actor,
      },
      reject_campaign: {
        kind: "reject",
        title: `رفض إعلان: ${entityTitle ?? "إعلان"}`,
        subtitle: actor,
        detail: stringPayloadValue(payload, "reason") ?? undefined,
      },
      approve_campaign_edit_request: {
        kind: "approve",
        title: `تمت الموافقة على طلب تعديل إعلان`,
        subtitle: actor,
        detail: stringPayloadValue(payload, "response") ?? undefined,
      },
      reject_campaign_edit_request: {
        kind: "reject",
        title: `تم رفض طلب تعديل إعلان`,
        subtitle: actor,
        detail: stringPayloadValue(payload, "reason") ?? undefined,
      },
      set_report_status: {
        kind: "report",
        title: `الأدمن حدّث حالة بلاغ`,
        subtitle: actor,
        detail: `الحالة: ${stringPayloadValue(payload, "status") ?? "—"}${stringPayloadValue(payload, "note") ? ` • ${stringPayloadValue(payload, "note")}` : ""}`,
      },
      set_appeal_status: {
        kind: "appeal",
        title: `الأدمن حدّث حالة طعن`,
        subtitle: actor,
        detail: `الحالة: ${stringPayloadValue(payload, "status") ?? "—"}${stringPayloadValue(payload, "note") ? ` • ${stringPayloadValue(payload, "note")}` : ""}`,
      },
      delete_review: {
        kind: "review",
        title: `الأدمن حذف تقييمًا`,
        subtitle: actor,
        detail: `التقييم: ${numberPayloadValue(payload, "rating") ?? 0} نجوم`,
      },
    };

    const event = mapping[log.action];
    if (!event) continue;
    events.push({
      id: `admin-log:${log.id}`,
      ...event,
      createdAt: log.created_at,
    });
  }

  // ── user signups ── (most recent 100 from the directory)
  const recentSignups = [...userDirectory.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((u) => u.createdAt >= sinceIso)
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

  const periodEvents = events.filter((e) => e.createdAt >= sinceIso);

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <div className={s.pageBreadcrumb}>
            لوحة التحكم <span>/</span> النشاط
          </div>
          <h1 className={s.pageTitle}>كل اللي بيحصل في رفيق</h1>
          <p className={s.pageSubtitle}>
            بث مباشر لكل ما يحدث في رفيق: من المستخدمين، ومقدمي الخدمة، والتفاعل داخل التطبيق، وأيضًا كل إجراءات الأدمن من لوحة التحكم نفسها.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
            {RANGE_OPTIONS.map((days) => {
              const active = days === rangeDays;
              return (
                <a
                  key={days}
                  href={rangeHref(days)}
                  style={{
                    padding: "0.45rem 0.8rem",
                    borderRadius: 999,
                    textDecoration: "none",
                    fontWeight: 800,
                    fontSize: "0.82rem",
                    background: active ? "#681F00" : "rgba(104,31,0,0.08)",
                    color: active ? "#fff" : "#681F00",
                  }}
                >
                  {days === 1 ? "آخر 24 ساعة" : `آخر ${days} يوم`}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <div className={s.statsRow}>
        <Kpi icon={<Activity size={22} />} value={periodEvents.length} label={rangeDays === 1 ? "نشاط آخر ٢٤ ساعة" : `نشاط آخر ${rangeDays} يوم`} tone="#681F00" />
        <Kpi icon={<UserPlus size={22} />} value={periodEvents.filter((e) => e.kind === "signup").length} label="تسجيلات جديدة" tone="#2563eb" />
        <Kpi icon={<CreditCard size={22} />} value={periodEvents.filter((e) => e.kind === "subscription").length} label="اشتراكات جديدة" tone="#10b981" />
        <Kpi icon={<CheckCircle2 size={22} />} value={periodEvents.filter((e) => e.kind === "approve").length} label="عمليات اعتماد" tone="#16a34a" />
        <Kpi icon={<XCircle size={22} />} value={periodEvents.filter((e) => e.kind === "reject").length} label="عمليات رفض" tone="#dc2626" />
        <Kpi icon={<Gavel size={22} />} value={periodEvents.filter((e) => e.kind === "appeal").length} label="طعون جديدة" tone="#d97706" />
        <Kpi icon={<Star size={22} />} value={periodEvents.filter((e) => e.kind === "review").length} label="تقييمات جديدة" tone="#f59e0b" />
        <Kpi icon={<Siren size={22} />} value={periodEvents.filter((e) => e.kind === "report").length} label="بلاغات جديدة" tone="#dc2626" />
        <Kpi icon={<Megaphone size={22} />} value={periodEvents.filter((e) => e.kind === "campaign").length} label="حملات أو طلبات إعلان" tone="#681F00" />
        <Kpi icon={<Heart size={22} />} value={periodEvents.filter((e) => e.kind === "favorite").length} label="تفاعلات المفضلة" tone="#db2777" />
        <Kpi icon={<Navigation size={22} />} value={periodEvents.filter((e) => e.kind === "map_open").length} label="فتح الخريطة" tone="#0284c7" />
        <Kpi icon={<MousePointerClick size={22} />} value={periodEvents.filter((e) => e.kind === "campaign_click").length} label="نقرات الإعلانات" tone="#9333ea" />
        <Kpi icon={<Activity size={22} />} value={periodEvents.filter((e) => e.kind === "admin_action").length} label="إجراءات الأدمن" tone="#4b5563" />
      </div>

      <ActivityFeed events={periodEvents} />
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
  campaign_impression: Megaphone,
  admin_action: Activity,
  place: MapPin,
  provider: Store,
};
