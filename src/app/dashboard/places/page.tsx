import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus, MapPin, Star } from "lucide-react";
import s from "../shared.module.css";
import PlacesFilters from "./PlacesFilters";
import { deletePlace } from "./actions";

export const metadata = { title: "إدارة الأماكن - رفيق" };

type PlaceRow = {
  place_id: number;
  place_name: string;
  city_name: string;
  activity_name: string;
  rating: number;
  budget: string;
  image_path: string | null;
};

export default async function PlacesPage() {
  const supabase = createAdminClient();

  const [{ data: places }, { count: total }] = await Promise.all([
    supabase.from("places").select("*").order("created_at", { ascending: false }),
    supabase.from("places").select("*", { count: "exact", head: true }),
  ]);

  const placeRows = (places ?? []) as PlaceRow[];

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
          <div className={s.statIcon} style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
            🏆
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{topActivity}</div>
            <div className={s.statLabel}>النشاط الأعلى</div>
          </div>
        </div>
      </div>

      <PlacesFilters places={placeRows} deleteAction={deletePlace} />
    </div>
  );
}
