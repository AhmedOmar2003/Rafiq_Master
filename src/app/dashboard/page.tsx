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
} from "lucide-react";
import { format } from "date-fns";

export const metadata = {
  title: "نظرة عامة - رفيق",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export default async function DashboardOverview() {
  const supabase = createAdminClient();

  const [
    { data: authUsers },
    { count: placesCount },
    { count: reviewsCount },
    { data: reviewsData },
    { data: recentPlacesData },
    { data: topPlacesData },
    { data: cityStatsData },
    { data: activityStatsData },
  ] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase.from("places").select("*", { count: "exact", head: true }),
    supabase.from("reviews").select("*", { count: "exact", head: true }),
    supabase.from("reviews").select("rating"),
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
    // City distribution
    supabase.from("places").select("city_name"),
    // Activity distribution
    supabase.from("places").select("activity_name"),
  ]);

  const usersCount = authUsers?.users.length ?? 0;
  const recentUsers = authUsers?.users.slice(0, 5) ?? [];
  const reviews = (reviewsData ?? []) as { rating: number | null }[];
  const recentPlaces = (recentPlacesData ?? []) as RecentPlaceRow[];
  const topPlaces = (topPlacesData ?? []) as PlaceWithReviews[];

  const avgRating =
    reviews && reviews.length > 0
      ? (
          reviews.reduce((acc, curr) => acc + Number(curr.rating ?? 0), 0) /
          reviews.length
        ).toFixed(1)
      : "0.0";

  // Build city distribution map
  const cityMap: Record<string, number> = {};
  (cityStatsData ?? []).forEach((p: { city_name: string }) => {
    cityMap[p.city_name] = (cityMap[p.city_name] || 0) + 1;
  });
  const cityStats = Object.entries(cityMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCityCount = cityStats[0]?.[1] || 1;

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
            مرحباً بك! إليك أبرز إحصائيات تطبيق رفيق اليوم.
          </p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.dateChip}>
            <Clock size={14} />
            {format(new Date(), "EEEE، d MMMM yyyy")}
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
      </div>

      {/* ── Main Grid ── */}
      <div className={styles.mainGrid}>

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
                const profile = user.user_metadata as {
                  full_name?: string;
                  name?: string;
                };
                const displayName =
                  profile?.full_name ||
                  profile?.name ||
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
                      {format(new Date(user.created_at), "MM/dd")}
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
