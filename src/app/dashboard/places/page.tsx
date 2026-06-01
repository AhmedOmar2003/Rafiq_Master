import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus, MapPin, Star, Trophy, Hourglass, CheckCircle2 } from "lucide-react";
import s from "../shared.module.css";
import PlacesFilters from "./PlacesFilters";
import { deletePlace, setPlaceStatus, setPlaceEditAllowed } from "./actions";
import { getProfileDirectory } from "@/lib/admin/users";

export const metadata = { title: "إدارة الأماكن - رفيق" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RawPlaceRow = {
  id: string;
  place_id: number;
  place_name: string;
  city_name: string;
  activity_name: string;
  rating: number;
  budget: string;
  image_path: string | null;
  status: "pending" | "approved" | "rejected" | "suspended" | null;
  created_at: string;
  rejection_reason: string | null;
  provider_id: string | null;
  edit_allowed: boolean | null;
};

type ProviderInfoRow = {
  id: string;
  owner_id: string | null;
  business_name: string | null;
  contact_email: string | null;
};

type AnalyticsEventRow = {
  place_id: string | null;
  kind: string;
};

type CampaignLiteRow = {
  place_id: string | null;
  status: string | null;
};

export default async function PlacesPage() {
  const supabase = createAdminClient();
  const analyticsCutoff = new Date();
  analyticsCutoff.setDate(analyticsCutoff.getDate() - 30);
  const analyticsCutoffIso = analyticsCutoff.toISOString();

  // Pull every read in parallel — but settle independently so one failure
  // doesn't tank the whole page. The providers + auth.users joins are
  // *enrichment*; if they ever throw (RLS drift, transient auth API hiccup,
  // bad column rename), the page should still render the core places table.
  // We log the per-source error so it surfaces in Vercel logs instead of
  // showing the user a black 500 page.
  const [placesResult, totalResult, providersResult, dirResult, analyticsResult, campaignsResult] =
    await Promise.allSettled([
      supabase
        .from("places")
        .select(
          "id,place_id,place_name,city_name,activity_name,rating,budget,image_path,created_at,status,rejection_reason,provider_id,edit_allowed",
        )
        .order("created_at", { ascending: false })
        .limit(250),
      supabase.from("places").select("*", { count: "exact", head: true }),
      supabase
        .from("providers")
        .select("id,owner_id,business_name,contact_email"),
      // Indexed profiles directory instead of the unpaginated auth API.
      getProfileDirectory(),
      supabase
        .from("analytics_events")
        .select("place_id,kind")
        .gte("occurred_at", analyticsCutoffIso)
        .limit(5000),
      supabase
        .from("promotional_campaigns")
        .select("place_id,status"),
    ]);

  function unwrap<T>(
    label: string,
    r: PromiseSettledResult<{ data: T | null; error: unknown }>,
  ): T | null {
    if (r.status === "rejected") {
      console.error(`[PlacesPage] ${label} rejected:`, r.reason);
      return null;
    }
    if (r.value.error) {
      console.error(`[PlacesPage] ${label} error:`, r.value.error);
    }
    return r.value.data;
  }

  const places = unwrap<RawPlaceRow[]>("places", placesResult);
  const providersData = unwrap<ProviderInfoRow[]>("providers", providersResult);
  const analyticsData = unwrap<AnalyticsEventRow[]>("analytics", analyticsResult);
  const campaignsData = unwrap<CampaignLiteRow[]>("campaigns", campaignsResult);

  // count comes from a head-only query, the shape is slightly different.
  let total = 0;
  if (totalResult.status === "fulfilled") {
    total = (totalResult.value as { count: number | null }).count ?? 0;
  } else {
    console.error("[PlacesPage] total count rejected:", totalResult.reason);
  }

  // Profiles directory (id → name/email). Failure here is non-fatal — owner
  // emails just go null and the OwnerCell falls back to the business name.
  type DirUser = { email: string | null; fullName: string | null };
  let ownerDirectory = new Map<string, DirUser>();
  if (dirResult.status === "fulfilled") {
    ownerDirectory = dirResult.value as Map<string, DirUser>;
  } else {
    console.error("[PlacesPage] profile directory rejected:", dirResult.reason);
  }

  const rawRows = (places ?? []) as RawPlaceRow[];

  // Build the provider lookup map. We index by both `id` and `owner_id` so
  // either resolution path works during the join.
  const providerById = new Map<string, ProviderInfoRow>();
  for (const p of (providersData ?? []) as ProviderInfoRow[]) {
    providerById.set(p.id, p);
  }
  const ownerById = new Map<string, { email?: string; name?: string }>();
  for (const [id, u] of ownerDirectory) {
    ownerById.set(id, {
      email: u.email ?? undefined,
      name: u.fullName ?? undefined,
    });
  }

  const analyticsByPlace = new Map<
    string,
    { views: number; favorites: number; mapClicks: number; interactions: number }
  >();
  for (const row of (analyticsData ?? []) as AnalyticsEventRow[]) {
    if (!row.place_id) continue;
    const current = analyticsByPlace.get(row.place_id) ?? {
      views: 0,
      favorites: 0,
      mapClicks: 0,
      interactions: 0,
    };
    switch (row.kind) {
      case "place_open":
        current.views += 1;
        break;
      case "place_favorite":
        current.favorites += 1;
        current.interactions += 1;
        break;
      case "place_map_open":
        current.mapClicks += 1;
        current.interactions += 1;
        break;
      case "place_unfavorite":
      case "place_share":
      case "place_phone_call":
      case "place_website_click":
      case "place_review_submit":
      case "recommendation_click":
        current.interactions += 1;
        break;
    }
    analyticsByPlace.set(row.place_id, current);
  }

  const campaignsByPlace = new Map<string, { total: number; pending: number }>();
  for (const row of (campaignsData ?? []) as CampaignLiteRow[]) {
    if (!row.place_id) continue;
    const current = campaignsByPlace.get(row.place_id) ?? { total: 0, pending: 0 };
    current.total += 1;
    if (row.status === "pending_review") current.pending += 1;
    campaignsByPlace.set(row.place_id, current);
  }

  const placeRows = rawRows.map((row) => {
    const provider = row.provider_id ? providerById.get(row.provider_id) : undefined;
    const owner = provider?.owner_id ? ownerById.get(provider.owner_id) : undefined;
    return {
      ...row,
      owner_business: provider?.business_name ?? null,
      owner_email: provider?.contact_email ?? owner?.email ?? null,
      owner_name: owner?.name ?? null,
      analytics_views: analyticsByPlace.get(row.id)?.views ?? 0,
      analytics_favorites: analyticsByPlace.get(row.id)?.favorites ?? 0,
      analytics_map_clicks: analyticsByPlace.get(row.id)?.mapClicks ?? 0,
      analytics_interactions: analyticsByPlace.get(row.id)?.interactions ?? 0,
      campaign_count: campaignsByPlace.get(row.id)?.total ?? 0,
      pending_campaign_count: campaignsByPlace.get(row.id)?.pending ?? 0,
    };
  });
  const pendingCount = placeRows.filter((p) => (p.status ?? "pending") === "pending").length;
  const approvedCount = placeRows.filter((p) => p.status === "approved").length;

  // Activity distribution
  const actMap: Record<string, number> = {};
  placeRows.forEach((p) => { actMap[p.activity_name] = (actMap[p.activity_name] || 0) + 1; });
  const topActivity = Object.entries(actMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const avgRating = placeRows.length > 0
    ? (placeRows.reduce((a, b) => a + b.rating, 0) / placeRows.length).toFixed(1)
    : "0.0";

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <div className={s.pageBreadcrumb}>
            لوحة التحكم <span>/</span> الأماكن
          </div>
          <h1 className={s.pageTitle}>إدارة الأماكن</h1>
          <p className={s.pageSubtitle}>
            إضافة وتعديل وحذف الأماكن المدرجة في التطبيق
          </p>
        </div>
        <div className={s.pageHeaderRight}>
          <Link href="/dashboard/places/new" className={s.primaryBtn}>
            <Plus size={18} />
            إضافة مكان جديد
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: "rgba(104,31,0,0.1)", color: "#681F00" }}>
            <MapPin size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{total ?? 0}</div>
            <div className={s.statLabel}>إجمالي الأماكن</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}>
            <Star size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{avgRating}</div>
            <div className={s.statLabel}>متوسط التقييم</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}>
            <Hourglass size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{pendingCount}</div>
            <div className={s.statLabel}>قيد المراجعة</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
            <CheckCircle2 size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{approvedCount}</div>
            <div className={s.statLabel}>تم الاعتماد</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: "rgba(139,92,246,0.12)", color: "#7c3aed" }}>
            <Trophy size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{topActivity}</div>
            <div className={s.statLabel}>النشاط الأعلى</div>
          </div>
        </div>
      </div>

      <PlacesFilters
        places={placeRows}
        deleteAction={deletePlace}
        setStatusAction={setPlaceStatus}
        setEditAllowedAction={setPlaceEditAllowed}
      />
    </div>
  );
}
