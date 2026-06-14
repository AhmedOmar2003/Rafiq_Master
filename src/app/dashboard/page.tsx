import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "./page.module.css";
import {
  Users,
  MapPin,
  Star,
  Activity,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Eye,
  Award,
  Zap,
  Building2,
  Waves,
  Building,
  TreePine,
  Trophy,
  Medal,
  Store,
  Crown,
  Banknote,
  Megaphone,
  Heart,
  Navigation,
  Siren,
  Edit3,
} from "lucide-react";
import { format } from "date-fns";
import GrowthChart from "./GrowthChart";
import { listAllAuthUsers } from "@/lib/admin/users";

export const metadata = {
  title: "نظرة عامة - رفيق",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RANGE_OPTIONS = [7, 14, 30, 90] as const;

type RecentPlaceRow = {
  place_id: number;
  place_name: string;
  city_name: string;
  activity_name: string;
  created_at: string;
  rating: number;
};

type PlaceWithReviews = {
  place_id: number;
  place_name: string;
  city_name: string;
  activity_name: string;
  review_count: number;
  rating: number;
};

type AnalyticsRollupRow = {
  kind: string;
  event_count: number | null;
  day: string;
};

type AnalyticsTodayRow = {
  kind: string;
};

function parseRange(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return RANGE_OPTIONS.includes(parsed as (typeof RANGE_OPTIONS)[number]) ? parsed : 7;
}

function buildRangeHref(days: number) {
  return `/dashboard?range=${days}`;
}

export default async function DashboardOverview({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string | string[] }>;
}) {
  const params = await searchParams;
  await connection();
  const supabase = createAdminClient();
  const rangeDays = parseRange(params?.range);
  // eslint-disable-next-line react-hooks/purity
  const rangeStartIso = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
  const rangeStartDay = rangeStartIso.slice(0, 10);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();
  const todayDay = todayStartIso.slice(0, 10);

  const [
    allUsers,
    { count: placesCount },
    { count: reviewsCount },
    { data: reviewsData },
    { data: recentPlacesData },
    { data: topPlacesData },
    { data: cityStatsData },
    { data: activityStatsData },
    { count: providersCount },
    { data: subsData },
    { data: catalogRows },
    { count: activeCampaignsCount },
    { count: pendingCampaignsCount },
    { count: pendingCampaignEditRequestsCount },
    { count: pendingPlaceEditRequestsCount },
    { count: openReportsCount },
    { data: analyticsRollupsData },
    { data: analyticsTodayData },
  ] = await Promise.all([
    // Full paginated roster — accurate count + growth bucketing at any scale.
    listAllAuthUsers(),
    supabase.from("places").select("*", { count: "exact", head: true }),
    supabase.from("reviews").select("*", { count: "exact", head: true }),
    supabase.from("reviews").select("rating").limit(1000),
    supabase
      .from("places")
      .select("place_id, place_name, city_name, activity_name, created_at, rating")
      .order("created_at", { ascending: false })
      .limit(5),
    // Top places by review count
    supabase
      .from("places")
      .select("place_id, place_name, city_name, activity_name, rating")
      .order("rating", { ascending: false })
      .limit(5),
    // City distribution + creation timestamps for the 14-day growth chart.
    supabase.from("places").select("city_name, created_at").limit(2000),
    // Activity distribution
    supabase.from("places").select("activity_name").limit(1000),
    // Providers total — every business row (incl. ones that bailed before
    // confirming a plan). Used only as a denominator; the headline
    // "مقدّمو الخدمة" KPI uses subscribed-providers below.
    supabase.from("providers").select("*", { count: "exact", head: true }),
    // Active subscriptions for paid-subs KPI + MRR projection. After
    // migration 0026, Free providers also have a row here, so the count of
    // *distinct provider_id values* is the true "confirmed providers" count.
    supabase
      .from("provider_subscriptions")
      .select(
        "tier, amount_paid_egp, metadata, period_start, period_end, status, provider_id"
      )
      .in("status", ["active", "trialing", "past_due"]),
    // Catalog for amount imputation on demo rows
    supabase
      .from("subscription_plans")
      .select("tier, price_monthly_egp, price_yearly_egp"),
    supabase
      .from("promotional_campaigns")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("promotional_campaigns")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_review"),
    supabase
      .from("promotional_campaigns")
      .select("*", { count: "exact", head: true })
      .eq("edit_request_status", "pending"),
    supabase
      .from("places")
      .select("*", { count: "exact", head: true })
      .eq("edit_request_status", "pending"),
    supabase
      .from("moderation_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("analytics_daily_rollups")
      .select("kind,event_count,day")
      .in("kind", ["place_open", "place_favorite", "place_map_open"])
      .gte("day", rangeStartDay)
      .lt("day", todayDay),
    supabase
      .from("analytics_events")
      .select("kind")
      .in("kind", ["place_open", "place_favorite", "place_map_open"])
      .gte("occurred_at", todayStartIso),
  ]);

  const usersCount = allUsers.length;
  // allUsers is already sorted newest-first by listAllAuthUsers (auth API
  // returns most-recent first per page).
  const recentUsers = allUsers.slice(0, 5);
  const reviews = (reviewsData ?? []) as { rating: number | null }[];
  const recentPlaces = (recentPlacesData ?? []) as RecentPlaceRow[];
  const topPlaces = (topPlacesData ?? []) as PlaceWithReviews[];
  const analyticsCounters = {
    place_open: 0,
    place_favorite: 0,
    place_map_open: 0,
  };
  for (const row of (analyticsRollupsData ?? []) as AnalyticsRollupRow[]) {
    const key = row.kind as keyof typeof analyticsCounters;
    if (!(key in analyticsCounters)) continue;
    analyticsCounters[key] += row.event_count ?? 0;
  }
  for (const row of (analyticsTodayData ?? []) as AnalyticsTodayRow[]) {
    const key = row.kind as keyof typeof analyticsCounters;
    if (!(key in analyticsCounters)) continue;
    analyticsCounters[key] += 1;
  }
  const placeOpenCount = analyticsCounters.place_open;
  const favoriteAddsCount = analyticsCounters.place_favorite;
  const mapOpenCount = analyticsCounters.place_map_open;

  const avgRating =
    reviews && reviews.length > 0
      ? (
          reviews.reduce((acc, curr) => acc + Number(curr.rating ?? 0), 0) /
          reviews.length
        ).toFixed(1)
      : "0.0";

  // Build city distribution map
  const cityMap: Record<string, number> = {};
  (cityStatsData ?? []).forEach((p: { city_name: string; created_at?: string }) => {
    cityMap[p.city_name] = (cityMap[p.city_name] || 0) + 1;
  });
  const cityStats = Object.entries(cityMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCityCount = cityStats[0]?.[1] || 1;

  // ── 14-day growth series ─────────────────────────────────────────────
  // Buckets users + places by created_at day so we can render a single
  // line chart with two series. Days with no rows still appear (count=0)
  // so the chart never has gaps.
  const days = 14;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }
  const seedZero = () => Object.fromEntries(dayKeys.map((k) => [k, 0]));
  const usersByDay: Record<string, number> = seedZero();
  const placesByDay: Record<string, number> = seedZero();
  allUsers.forEach((u) => {
    const key = u.createdAt?.slice(0, 10);
    if (key && key in usersByDay) usersByDay[key]++;
  });
  (cityStatsData ?? []).forEach((p: { created_at?: string }) => {
    const key = p.created_at?.slice(0, 10);
    if (key && key in placesByDay) placesByDay[key]++;
  });
  const growthSeries = dayKeys.map((key) => ({
    day: key.slice(5), // MM-DD
    users: usersByDay[key],
    places: placesByDay[key],
  }));

  // Build activity distribution map
  const activityMap: Record<string, number> = {};
  (activityStatsData ?? []).forEach((p: { activity_name: string }) => {
    activityMap[p.activity_name] = (activityMap[p.activity_name] || 0) + 1;
  });
  const activityStats = Object.entries(activityMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const activityColors: Record<string, string> = {
    طعام: "#f59e0b",
    ترفيه: "#8b5cf6",
    سياحي: "#10b981",
    رياضة: "#3b82f6",
    فاجئني: "#ec4899",
  };

  const cityIcons: Record<string, React.ReactNode> = {
    القاهرة: <Building2 size={14} />,
    الإسكندرية: <Waves size={14} />,
    المنصورة: <Building size={14} />,
    طنطا: <TreePine size={14} />,
    "أي حتة": <MapPin size={14} />,
  };

  const totalPlaces = placesCount ?? 0;

  // ── Providers + paid subscriptions + MRR ──────────────────────────────
  //
  // The paid-subs KPI excludes Free entries (which never appear in
  // provider_subscriptions anyway — Free is the absence of a row in the
  // view). MRR normalizes yearly subs to a monthly equivalent so the figure
  // stays comparable as the gateway flips between billing cycles.
  type SubLite = {
    tier: string;
    amount_paid_egp: number | null;
    metadata: Record<string, unknown> | null;
    period_start: string | null;
    period_end: string | null;
    provider_id: string;
  };
  type CatalogLite = {
    tier: string;
    price_monthly_egp: number | null;
    price_yearly_egp: number | null;
  };
  const catalogMap = new Map<string, CatalogLite>();
  for (const row of (catalogRows ?? []) as CatalogLite[]) {
    catalogMap.set(row.tier, row);
  }
  const subs = (subsData ?? []) as SubLite[];
  // Paid subs = Pro/Max (the revenue line). Free subs still count as
  // confirmed providers but don't move the paid KPI.
  const paidSubsCount = subs.filter((s) => s.tier !== "free").length;
  // Confirmed providers = distinct provider_id values that have an active sub
  // (any tier). This is the "true" number the admin should see.
  const confirmedProvidersCount = new Set(subs.map((s) => s.provider_id)).size;
  const mrr = subs.reduce((acc, sub) => {
    const start = sub.period_start ? new Date(sub.period_start).getTime() : 0;
    const end = sub.period_end ? new Date(sub.period_end).getTime() : 0;
    const yearly =
      sub.metadata?.yearly === true ||
      (start > 0 && end > 0 && (end - start) / (1000 * 60 * 60 * 24) > 90);
    let amount = sub.amount_paid_egp ?? 0;
    if (amount === 0) {
      const cat = catalogMap.get(sub.tier);
      if (cat) {
        amount = yearly
          ? cat.price_yearly_egp ?? 0
          : cat.price_monthly_egp ?? 0;
      }
    }
    return acc + (yearly ? Math.floor(amount / 12) : amount);
  }, 0);
  const totalProviders = providersCount ?? 0;

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerBadge}>
            <Zap size={14} />
            لوحة التحكم
          </div>
          <h1 className={styles.title}>نظرة عامة</h1>
          <p className={styles.subtitle}>
            أهم اللي بيحصل في رفيق قدامك بسرعة ووضوح.
          </p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.dateChip}>
            <Clock size={14} />
            {format(new Date(), "EEEE، d MMMM yyyy")}
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              marginTop: "0.75rem",
            }}
          >
            {RANGE_OPTIONS.map((days) => {
              const active = days === rangeDays;
              return (
                <a
                  key={days}
                  href={buildRangeHref(days)}
                  aria-current={active ? "page" : undefined}
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
                  آخر {days} يوم
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── KPI Stats Row ── */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statCardPrimary}`}>
          <div className={styles.statCardBg} />
          <div className={styles.statIconWrap}>
            <Users size={22} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{usersCount}</span>
            <span className={styles.statLabel}>إجمالي المستخدمين</span>
          </div>
          <div className={styles.statTrend}>
            <ArrowUpRight size={16} />
            <span>نشط</span>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statCardGold}`}>
          <div className={styles.statCardBg} />
          <div className={styles.statIconWrap}>
            <MapPin size={22} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{totalPlaces}</span>
            <span className={styles.statLabel}>الأماكن المدرجة</span>
          </div>
          <div className={styles.statTrend}>
            <TrendingUp size={16} />
            <span>مضافة</span>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statCardGreen}`}>
          <div className={styles.statCardBg} />
          <div className={styles.statIconWrap}>
            <Star size={22} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{reviewsCount ?? 0}</span>
            <span className={styles.statLabel}>عدد التقييمات</span>
          </div>
          <div className={styles.statTrend}>
            <Eye size={16} />
            <span>كلي</span>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statCardGold}`}>
          <div className={styles.statCardBg} />
          <div className={styles.statIconWrap}>
            <Edit3 size={22} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>
              {pendingPlaceEditRequestsCount ?? 0}
            </span>
            <span className={styles.statLabel}>طلبات تعديل أماكن</span>
          </div>
          <div className={styles.statTrend}>
            <Clock size={16} />
            <span>تحتاج قرار</span>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statCardPurple}`}>
          <div className={styles.statCardBg} />
          <div className={styles.statIconWrap}>
            <Activity size={22} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>
              {avgRating} <Star size={20} fill="var(--color-primary)" style={{ display: "inline-block", position: "relative", top: "2px" }} />
            </span>
            <span className={styles.statLabel}>متوسط التقييم</span>
          </div>
          <div className={styles.statTrend}>
            <Award size={16} />
            <span>إجمالي</span>
          </div>
        </div>

        {/* Providers KPI — businesses signed up on the platform */}
        <div className={`${styles.statCard} ${styles.statCardPrimary}`}>
          <div className={styles.statCardBg} />
          <div className={styles.statIconWrap}>
            <Store size={22} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{confirmedProvidersCount}</span>
            <span className={styles.statLabel}>مقدّمو الخدمة</span>
          </div>
          <div className={styles.statTrend}>
            <ArrowUpRight size={16} />
            <span>
              {totalProviders > confirmedProvidersCount
                ? `${totalProviders - confirmedProvidersCount} لم يكمل`
                : "مؤكّدون"}
            </span>
          </div>
        </div>

        {/* Paid subs KPI — the revenue-driving accounts */}
        <div className={`${styles.statCard} ${styles.statCardGold}`}>
          <div className={styles.statCardBg} />
          <div className={styles.statIconWrap}>
            <Crown size={22} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{paidSubsCount}</span>
            <span className={styles.statLabel}>مشتركين مدفوع</span>
          </div>
          <div className={styles.statTrend}>
            <TrendingUp size={16} />
            <span>Pro / Max</span>
          </div>
        </div>

        {/* Projected monthly recurring revenue */}
        <div className={`${styles.statCard} ${styles.statCardGreen}`}>
          <div className={styles.statCardBg} />
          <div className={styles.statIconWrap}>
            <Banknote size={22} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>
              {mrr.toLocaleString("en-EG")} ج.م
            </span>
            <span className={styles.statLabel}>إيراد شهري متوقّع</span>
          </div>
          <div className={styles.statTrend}>
            <ArrowUpRight size={16} />
            <span>MRR</span>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statCardPrimary}`}>
          <div className={styles.statCardBg} />
          <div className={styles.statIconWrap}>
            <Megaphone size={22} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{activeCampaignsCount ?? 0}</span>
            <span className={styles.statLabel}>إعلانات نشطة</span>
          </div>
          <div className={styles.statTrend}>
            <Clock size={16} />
            <span>{pendingCampaignsCount ?? 0} جديدة + {pendingCampaignEditRequestsCount ?? 0} تعديل</span>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statCardPurple}`}>
          <div className={styles.statCardBg} />
          <div className={styles.statIconWrap}>
            <Siren size={22} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{openReportsCount ?? 0}</span>
            <span className={styles.statLabel}>بلاغات مفتوحة</span>
          </div>
          <div className={styles.statTrend}>
            <Activity size={16} />
            <span>تحتاج متابعة</span>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statCardGold}`}>
          <div className={styles.statCardBg} />
          <div className={styles.statIconWrap}>
            <Eye size={22} />
          </div>
          <div className={styles.statBody}>
            <span className={styles.statValue}>{placeOpenCount ?? 0}</span>
            <span className={styles.statLabel}>فتح تفاصيل خلال آخر {rangeDays} يوم</span>
          </div>
          <div className={styles.statTrend}>
            <ArrowUpRight size={16} />
            <span>تفاعل حقيقي</span>
          </div>
        </div>
      </div>

      {/* ── 14-day growth chart ── */}
      <GrowthChart series={growthSeries} />

      {/* ── Main Grid ── */}
      <div className={styles.mainGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <Activity className={styles.cardTitleIcon} size={18} />
              <h2 className={styles.cardTitle}>نبض التفاعل</h2>
            </div>
            <span className={styles.cardBadge}>آخر {rangeDays} يوم</span>
          </div>
          <div className={styles.activityGrid}>
            <div className={styles.activityCard}>
              <div className={styles.activityDot} style={{ background: "#681F00" }} />
              <div className={styles.activityBody}>
                <span className={styles.activityName}>فتح التفاصيل</span>
                <span className={styles.activityCount}>{placeOpenCount ?? 0} مرة</span>
              </div>
              <div className={styles.activityPercent} style={{ color: "#681F00" }}>
                <Eye size={16} />
              </div>
            </div>
            <div className={styles.activityCard}>
              <div className={styles.activityDot} style={{ background: "#db2777" }} />
              <div className={styles.activityBody}>
                <span className={styles.activityName}>إضافات المفضلة</span>
                <span className={styles.activityCount}>{favoriteAddsCount ?? 0} مرة</span>
              </div>
              <div className={styles.activityPercent} style={{ color: "#db2777" }}>
                <Heart size={16} />
              </div>
            </div>
            <div className={styles.activityCard}>
              <div className={styles.activityDot} style={{ background: "#0284c7" }} />
              <div className={styles.activityBody}>
                <span className={styles.activityName}>فتح الخريطة</span>
                <span className={styles.activityCount}>{mapOpenCount ?? 0} مرة</span>
              </div>
              <div className={styles.activityPercent} style={{ color: "#0284c7" }}>
                <Navigation size={16} />
              </div>
            </div>
            <div className={styles.activityCard}>
              <div className={styles.activityDot} style={{ background: "#16a34a" }} />
              <div className={styles.activityBody}>
                <span className={styles.activityName}>الإعلانات النشطة</span>
                <span className={styles.activityCount}>{activeCampaignsCount ?? 0} حملة</span>
              </div>
              <div className={styles.activityPercent} style={{ color: "#16a34a" }}>
                <Megaphone size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Top Places ── */}
        <div className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <Award className={styles.cardTitleIcon} size={18} />
              <h2 className={styles.cardTitle}>أعلى الأماكن تقييماً</h2>
            </div>
            <span className={styles.cardBadge}>أكثر تفاعلاً</span>
          </div>
          <div className={styles.topPlacesList}>
            {topPlaces.length === 0 ? (
              <div className={styles.emptyState}>لا توجد بيانات بعد</div>
            ) : (
              topPlaces.map((place, i) => (
                <div key={place.place_id} className={styles.topPlaceRow}>
                  <div className={styles.rankBadge}>
                    {i === 0 ? <Trophy size={16} color="#f59e0b" /> : i === 1 ? <Medal size={16} color="#9ca3af" /> : i === 2 ? <Medal size={16} color="#b45309" /> : `#${i + 1}`}
                  </div>
                  <div className={styles.topPlaceInfo}>
                    <span className={styles.topPlaceName}>{place.place_name}</span>
                    <span className={styles.topPlaceMeta}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                        {cityIcons[place.city_name] || <MapPin size={14} />} {place.city_name}
                      </span> — {place.activity_name}
                    </span>
                  </div>
                  <div className={styles.ratingPill} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Star size={14} fill="currentColor" stroke="currentColor" /> {Number(place.rating).toFixed(1)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── City Distribution ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <MapPin className={styles.cardTitleIcon} size={18} />
              <h2 className={styles.cardTitle}>توزيع الأماكن بالمدن</h2>
            </div>
          </div>
          <div className={styles.barChartList}>
            {cityStats.length === 0 ? (
              <div className={styles.emptyState}>لا توجد بيانات</div>
            ) : (
              cityStats.map(([city, count]) => (
                <div key={city} className={styles.barRow}>
                  <div className={styles.barLabel} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ color: "var(--color-gray)", display: "flex" }}>{cityIcons[city] || <MapPin size={14} />}</span>
                    <span>{city}</span>
                  </div>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{
                        width: `${(count / maxCityCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className={styles.barCount}>{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Activity Breakdown ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <Activity className={styles.cardTitleIcon} size={18} />
              <h2 className={styles.cardTitle}>أنواع الأنشطة</h2>
            </div>
          </div>
          <div className={styles.activityGrid}>
            {activityStats.length === 0 ? (
              <div className={styles.emptyState}>لا توجد بيانات</div>
            ) : (
              activityStats.map(([activity, count]) => {
                const color = activityColors[activity] || "#681F00";
                const percent =
                  totalPlaces > 0 ? Math.round((count / totalPlaces) * 100) : 0;
                return (
                  <div key={activity} className={styles.activityCard}>
                    <div
                      className={styles.activityDot}
                      style={{ background: color }}
                    />
                    <div className={styles.activityBody}>
                      <span className={styles.activityName}>{activity}</span>
                      <span className={styles.activityCount}>{count} مكان</span>
                    </div>
                    <div className={styles.activityPercent} style={{ color }}>
                      {percent}%
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Recent Users ── */}
        <div className={`${styles.card} ${styles.cardMedium}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <Users className={styles.cardTitleIcon} size={18} />
              <h2 className={styles.cardTitle}>أحدث المستخدمين</h2>
            </div>
            <span className={styles.cardBadge}>{usersCount} مستخدم</span>
          </div>
          <div className={styles.userList}>
            {recentUsers.length === 0 ? (
              <div className={styles.emptyState}>لا يوجد مستخدمون</div>
            ) : (
              recentUsers.map((user, i) => {
                const displayName =
                  user.fullName ||
                  user.email?.split("@")[0] ||
                  "بدون اسم";
                const avatarColors = [
                  "#681F00", "#8b5cf6", "#10b981", "#f59e0b", "#3b82f6"
                ];
                const color = avatarColors[i % avatarColors.length];

                return (
                  <div key={user.id} className={styles.userRow}>
                    <div
                      className={styles.userAvatar}
                      style={{ background: `${color}20`, color }}
                    >
                      {String(displayName).slice(0, 1).toUpperCase()}
                    </div>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{displayName}</span>
                      <span className={styles.userEmail}>{user.email}</span>
                    </div>
                    <div className={styles.userDate}>
                      {format(new Date(user.createdAt), "MM/dd")}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Recent Places ── */}
        <div className={`${styles.card} ${styles.cardMedium}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <Clock className={styles.cardTitleIcon} size={18} />
              <h2 className={styles.cardTitle}>أحدث الأماكن المضافة</h2>
            </div>
          </div>
          <div className={styles.placeList}>
            {recentPlaces.length === 0 ? (
              <div className={styles.emptyState}>لا توجد أماكن بعد</div>
            ) : (
              recentPlaces.map((place) => (
                <div key={place.place_id} className={styles.placeRow}>
                  <div
                    className={styles.placeIcon}
                    style={{
                      background: `${activityColors[place.activity_name] || "#681F00"}18`,
                      color: activityColors[place.activity_name] || "#681F00",
                    }}
                  >
                    <MapPin size={16} />
                  </div>
                  <div className={styles.placeInfo}>
                    <span className={styles.placeName}>{place.place_name}</span>
                    <span className={styles.placeMeta}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                        {cityIcons[place.city_name] || <MapPin size={14} />} {place.city_name}
                      </span>
                    </span>
                  </div>
                  <div
                    className={styles.activityTag}
                    style={{
                      background: `${activityColors[place.activity_name] || "#681F00"}18`,
                      color: activityColors[place.activity_name] || "#681F00",
                    }}
                  >
                    {place.activity_name}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
