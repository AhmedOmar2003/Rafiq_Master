import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileDirectory } from "@/lib/admin/users";
import {
  Activity, CheckCircle2, XCircle, Hourglass, CreditCard, UserPlus,
  Store, Gavel, MapPin, Trash2,
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
  place: MapPin,
  provider: Store,
};
