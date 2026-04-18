import { createAdminClient } from "@/lib/supabase/admin";
import { Star } from "lucide-react";
import s from "../shared.module.css";
import ReviewsFilters from "./ReviewsFilters";
import { deleteReview } from "./actions";

export const metadata = { title: "إدارة التقييمات - رفيق" };

type ReviewRow = {
  review_id: number;
  review_text: string;
  created_at: string;
  rating: number;
  name: string;
  places?: { place_name?: string } | null;
};

type RatingRow = {
  rating: number | null;
};

export default async function ReviewsPage() {
  const supabase = createAdminClient();

  const [{ data: reviews }, { count: total }, { data: ratingData }] =
    await Promise.all([
      supabase
        .from("reviews")
        .select("*, places(place_name)")
        .order("created_at", { ascending: false }),
      supabase.from("reviews").select("*", { count: "exact", head: true }),
      supabase.from("reviews").select("rating"),
    ]);

  const reviewRows = (reviews ?? []) as ReviewRow[];
  const ratingRows = (ratingData ?? []) as RatingRow[];
  const avgRating =
    ratingRows.length > 0
      ? (
          ratingRows.reduce((a, b) => a + Number(b.rating ?? 0), 0) /
          ratingRows.length
        ).toFixed(1)
      : "0.0";

  const dist = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: reviewRows.filter((r) => r.rating === star).length,
  }));

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <div className={s.pageBreadcrumb}>
            لوحة التحكم <span>/</span> التقييمات
          </div>
          <h1 className={s.pageTitle}>إدارة التقييمات</h1>
          <p className={s.pageSubtitle}>
            مراقبة وإدارة تقييمات المستخدمين لجميع الأماكن
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div
            className={s.statIcon}
            style={{ background: "rgba(245,158,11,0.12)", color: "#b45309" }}
          >
            <Star size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{total ?? 0}</div>
            <div className={s.statLabel}>إجمالي التقييمات</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div
            className={s.statIcon}
            style={{ background: "rgba(104,31,0,0.10)", color: "#681F00" }}
          >
            <Star size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{avgRating} ★</div>
            <div className={s.statLabel}>متوسط التقييم</div>
          </div>
        </div>
        {dist.slice(2).map(({ star, count }) => (
          <div className={s.statCard} key={star}>
            <div
              className={s.statIcon}
              style={{ background: "rgba(245,158,11,0.08)", color: "#d97706" }}
            >
              {"★".repeat(star)}
            </div>
            <div className={s.statBody}>
              <div className={s.statValue}>{count}</div>
              <div className={s.statLabel}>{star} نجوم</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Table */}
      <ReviewsFilters reviews={reviewRows} deleteAction={deleteReview} />
    </div>
  );
}
