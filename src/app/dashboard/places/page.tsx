import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus, MapPin, Star, Trophy, Hourglass, CheckCircle2 } from "lucide-react";
import s from "../shared.module.css";
import PlacesFilters from "./PlacesFilters";
import { deletePlace, setPlaceStatus } from "./actions";

export const metadata = { title: "إدارة الأماكن - رفيق" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RawPlaceRow = {
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
};

type ProviderInfoRow = {
  id: string;
  owner_id: string | null;
  business_name: string | null;
  contact_email: string | null;
};

export default async function PlacesPage() {
  const supabase = createAdminClient();

  // Pull places + providers + auth.users in parallel. The places table only
  // carries `provider_id` as an FK, so we resolve the business name and the
  // owner's email/full_name by joining on the client. With the indexes from
  // migration 0025, these three reads stay sub-100ms even at scale.
  const [
    { data: places },
    { count: total },
    { data: providersData },
    { data: authUsersData },
  ] = await Promise.all([
    supabase
      .from("places")
      .select(
        "place_id,place_name,city_name,activity_name,rating,budget,image_path,created_at,status,rejection_reason,provider_id",
      )
      .order("created_at", { ascending: false })
      .limit(250),
    supabase.from("places").select("*", { count: "exact", head: true }),
    supabase.from("providers").select("id,owner_id,business_name,contact_email"),
    supabase.auth.admin.listUsers(),
  ]);

  const rawRows = (places ?? []) as RawPlaceRow[];

  // Build the provider lookup map. We index by both `id` and `owner_id` so
  // either resolution path works during the join.
  const providerById = new Map<string, ProviderInfoRow>();
  for (const p of (providersData ?? []) as ProviderInfoRow[]) {
    providerById.set(p.id, p);
  }
  const ownerById = new Map<string, { email?: string; name?: string }>();
  for (const u of authUsersData?.users ?? []) {
    const meta = (u.user_metadata ?? {}) as { full_name?: string; name?: string };
    ownerById.set(u.id, {
      email: u.email,
      name: meta.full_name ?? meta.name,
    });
  }

  const placeRows = rawRows.map((row) => {
    const provider = row.provider_id ? providerById.get(row.provider_id) : undefined;
    const owner = provider?.owner_id ? ownerById.get(provider.owner_id) : undefined;
    return {
      ...row,
      owner_business: provider?.business_name ?? null,
      owner_email: provider?.contact_email ?? owner?.email ?? null,
      owner_name: owner?.name ?? null,
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
      />
    </div>
  );
}
