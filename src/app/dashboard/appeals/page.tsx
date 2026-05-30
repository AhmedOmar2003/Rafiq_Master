import { createAdminClient } from "@/lib/supabase/admin";
import { Gavel, Hourglass, CheckCircle2, XCircle } from "lucide-react";
import s from "../shared.module.css";
import AppealsList, { type AppealRow } from "./AppealsList";
import { setAppealStatus } from "./actions";

export const metadata = { title: "الطعون - رفيق" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RawAppeal = {
  id: string;
  place_id: number;
  provider_id: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  message: string;
  status: "pending" | "reviewing" | "resolved" | "rejected";
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type PlaceLite = {
  place_id: number;
  place_name: string;
  rejection_reason: string | null;
  status: string | null;
};

type ProviderLite = {
  id: string;
  business_name: string | null;
  contact_email: string | null;
};

export default async function AppealsPage() {
  const supabase = createAdminClient();

  const [appealsRes, placesRes, providersRes] = await Promise.allSettled([
    supabase
      .from("place_appeals")
      .select(
        "id,place_id,provider_id,contact_name,contact_phone,contact_email," +
          "message,status,reviewer_note,reviewed_at,created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("places").select("place_id,place_name,rejection_reason,status"),
    supabase.from("providers").select("id,business_name,contact_email"),
  ]);

  const rawAppeals =
    appealsRes.status === "fulfilled" ? (appealsRes.value.data ?? []) : [];
  const rawPlaces =
    placesRes.status === "fulfilled" ? (placesRes.value.data ?? []) : [];
  const rawProviders =
    providersRes.status === "fulfilled" ? (providersRes.value.data ?? []) : [];

  if (appealsRes.status === "fulfilled" && appealsRes.value.error) {
    console.error("[AppealsPage] appeals error:", appealsRes.value.error);
  }

  const placeMap = new Map<number, PlaceLite>();
  for (const p of rawPlaces as PlaceLite[]) {
    placeMap.set(p.place_id, p);
  }
  const providerMap = new Map<string, ProviderLite>();
  for (const p of rawProviders as ProviderLite[]) {
    providerMap.set(p.id, p);
  }

  const appeals: AppealRow[] = (rawAppeals as RawAppeal[]).map((a) => {
    const place = placeMap.get(a.place_id);
    const provider = a.provider_id ? providerMap.get(a.provider_id) : undefined;
    return {
      id: a.id,
      placeId: a.place_id,
      placeName: place?.place_name ?? `#${a.place_id}`,
      placeStatus: place?.status ?? null,
      placeRejectionReason: place?.rejection_reason ?? null,
      providerBusiness: provider?.business_name ?? null,
      providerEmail: provider?.contact_email ?? null,
      contactName: a.contact_name,
      contactPhone: a.contact_phone,
      contactEmail: a.contact_email,
      message: a.message,
      status: a.status,
      reviewerNote: a.reviewer_note,
      reviewedAt: a.reviewed_at,
      createdAt: a.created_at,
    };
  });

  const totals = {
    all: appeals.length,
    pending: appeals.filter((a) => a.status === "pending").length,
    reviewing: appeals.filter((a) => a.status === "reviewing").length,
    resolved: appeals.filter((a) => a.status === "resolved").length,
    rejected: appeals.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <div className={s.pageBreadcrumb}>
            لوحة التحكم <span>/</span> الطعون
          </div>
          <h1 className={s.pageTitle}>الطعون على قرارات الرفض</h1>
          <p className={s.pageSubtitle}>
            مقدمو الخدمات بيقدّموا اعتراضات على رفض أماكنهم من هنا — راجع كل
            طعن، تواصل معهم، وغيّر الحالة بعد القرار.
          </p>
        </div>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div
            className={s.statIcon}
            style={{ background: "rgba(104,31,0,0.10)", color: "#681F00" }}
          >
            <Gavel size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{totals.all}</div>
            <div className={s.statLabel}>إجمالي الطعون</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div
            className={s.statIcon}
            style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}
          >
            <Hourglass size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{totals.pending}</div>
            <div className={s.statLabel}>في الانتظار</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div
            className={s.statIcon}
            style={{ background: "rgba(59,130,246,0.12)", color: "#2563eb" }}
          >
            <Hourglass size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{totals.reviewing}</div>
            <div className={s.statLabel}>قيد المراجعة</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div
            className={s.statIcon}
            style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{totals.resolved}</div>
            <div className={s.statLabel}>تم الحل</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div
            className={s.statIcon}
            style={{ background: "rgba(220,38,38,0.12)", color: "#dc2626" }}
          >
            <XCircle size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{totals.rejected}</div>
            <div className={s.statLabel}>مرفوض</div>
          </div>
        </div>
      </div>

      <AppealsList appeals={appeals} setStatusAction={setAppealStatus} />
    </div>
  );
}
