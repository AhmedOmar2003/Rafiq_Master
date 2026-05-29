import { createAdminClient } from "@/lib/supabase/admin";
import { Store, Crown, Sparkles, Hourglass, CheckCircle2 } from "lucide-react";
import s from "../shared.module.css";
import ProvidersFilters, { type ProviderRow } from "./ProvidersFilters";

export const metadata = { title: "مقدّمو الخدمة - رفيق" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RawProvider = {
  id: string;
  owner_id: string | null;
  business_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string | null;
  created_at: string;
};

type CurrentPlanRow = {
  provider_id: string;
  tier: string;
  status: string | null;
  period_end: string | null;
  cancel_at_period_end: boolean | null;
};

type PlaceRow = { provider_id: string | null };

/**
 * Providers operations page.
 *
 * Distinct from `/dashboard/users` — that view shows every signed-up account,
 * this one shows the businesses on the platform. Each row joins:
 *   - `providers`               → the business identity (name, contact, status)
 *   - `provider_current_plan`   → effective tier from the catalog view
 *   - `places` (counted)        → spot ghost accounts vs active sellers
 *
 * RLS is bypassed by the service-role admin client so we see every provider
 * regardless of moderation state.
 */
export default async function ProvidersPage() {
  const supabase = createAdminClient();

  const [
    { data: providersData, error },
    { data: plansData },
    { data: placesData },
  ] = await Promise.all([
    supabase
      .from("providers")
      .select(
        "id, owner_id, business_name, contact_email, contact_phone, status, created_at"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("provider_current_plan")
      .select("provider_id, tier, status, period_end, cancel_at_period_end"),
    supabase.from("places").select("provider_id"),
  ]);

  if (error) {
    return (
      <div className={s.page}>
        <p style={{ color: "var(--color-danger)" }}>
          تعذر تحميل مقدّمي الخدمة: {error.message}
        </p>
      </div>
    );
  }

  const planByProvider = new Map<string, CurrentPlanRow>();
  for (const row of (plansData ?? []) as CurrentPlanRow[]) {
    planByProvider.set(row.provider_id, row);
  }

  const placeCount = new Map<string, number>();
  for (const row of (placesData ?? []) as PlaceRow[]) {
    if (!row.provider_id) continue;
    placeCount.set(row.provider_id, (placeCount.get(row.provider_id) ?? 0) + 1);
  }

  const providers: ProviderRow[] = (providersData ?? [] as RawProvider[]).map(
    (p: RawProvider) => {
      const plan = planByProvider.get(p.id);
      return {
        id: p.id,
        ownerId: p.owner_id,
        businessName: p.business_name ?? "—",
        contactEmail: p.contact_email ?? "—",
        contactPhone: p.contact_phone,
        status: (p.status ?? "pending") as ProviderRow["status"],
        createdAt: p.created_at,
        tier: (plan?.tier ?? "free") as ProviderRow["tier"],
        periodEnd: plan?.period_end ?? null,
        cancelAtPeriodEnd: plan?.cancel_at_period_end ?? false,
        placeCount: placeCount.get(p.id) ?? 0,
      };
    }
  );

  const total = providers.length;
  const approved = providers.filter((p) => p.status === "approved").length;
  const pending = providers.filter((p) => p.status === "pending").length;
  const paid = providers.filter((p) => p.tier !== "free").length;

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <div className={s.pageBreadcrumb}>
            لوحة التحكم <span>/</span> مقدّمو الخدمة
          </div>
          <h1 className={s.pageTitle}>مقدّمو الخدمة</h1>
          <p className={s.pageSubtitle}>
            كل النشاطات المسجّلة على المنصة، خطّتها الحالية وحالة الاعتماد.
          </p>
        </div>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div
            className={s.statIcon}
            style={{ background: "rgba(104,31,0,0.10)", color: "#681F00" }}
          >
            <Store size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{total}</div>
            <div className={s.statLabel}>إجمالي المزوّدين</div>
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
            <div className={s.statValue}>{approved}</div>
            <div className={s.statLabel}>معتمد</div>
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
            <div className={s.statValue}>{pending}</div>
            <div className={s.statLabel}>قيد المراجعة</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div
            className={s.statIcon}
            style={{ background: "rgba(139,92,246,0.12)", color: "#7c3aed" }}
          >
            <Crown size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{paid}</div>
            <div className={s.statLabel}>على خطة مدفوعة</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div
            className={s.statIcon}
            style={{ background: "rgba(59,130,246,0.12)", color: "#2563eb" }}
          >
            <Sparkles size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>
              {total === 0 ? "0%" : `${Math.round((paid / total) * 100)}%`}
            </div>
            <div className={s.statLabel}>نسبة التحويل للمدفوع</div>
          </div>
        </div>
      </div>

      <ProvidersFilters providers={providers} />
    </div>
  );
}
