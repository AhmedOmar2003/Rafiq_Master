import { createAdminClient } from "@/lib/supabase/admin";
import { CreditCard, Crown, TrendingUp, Repeat, Banknote } from "lucide-react";
import s from "../shared.module.css";
import SubscriptionsFilters, {
  type SubscriptionRow,
} from "./SubscriptionsFilters";

export const metadata = { title: "الاشتراكات - رفيق" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RawSubscription = {
  id: string;
  provider_id: string;
  tier: string;
  status: string;
  gateway: string;
  period_start: string | null;
  period_end: string | null;
  cancel_at_period_end: boolean | null;
  amount_paid_egp: number | null;
  currency: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type CatalogRow = {
  tier: string;
  price_monthly_egp: number | null;
  price_yearly_egp: number | null;
};

type ProviderRow = {
  id: string;
  business_name: string | null;
  contact_email: string | null;
  owner_id: string | null;
};

/**
 * Revenue / billing console.
 *
 * Reads the *raw* `provider_subscriptions` rows (not the flattened view) so
 * the admin can audit the underlying billing facts — gateway, amount, period,
 * source of the subscription. We pre-join the provider business name so the
 * admin doesn't have to chase a UUID.
 *
 * Demo / manual rows where `amount_paid_egp = 0` get the catalog price
 * imputed so MRR isn't artificially zero before the gateway goes live.
 */
export default async function SubscriptionsPage() {
  const supabase = createAdminClient();

  const [
    { data: subsData, error },
    { data: catalogData },
    { data: providersData },
  ] = await Promise.all([
    supabase
      .from("provider_subscriptions")
      .select(
        "id, provider_id, tier, status, gateway, period_start, period_end, " +
          "cancel_at_period_end, amount_paid_egp, currency, metadata, created_at"
      )
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false }),
    supabase
      .from("subscription_plans")
      .select("tier, price_monthly_egp, price_yearly_egp"),
    supabase
      .from("providers")
      .select("id, business_name, contact_email, owner_id"),
  ]);

  if (error) {
    return (
      <div className={s.page}>
        <p style={{ color: "var(--color-danger)" }}>
          تعذر تحميل الاشتراكات: {error.message}
        </p>
      </div>
    );
  }

  const catalog = new Map<string, CatalogRow>();
  for (const row of (catalogData ?? []) as CatalogRow[]) {
    catalog.set(row.tier, row);
  }
  const providerInfo = new Map<
    string,
    { name: string; email: string | null }
  >();
  for (const row of (providersData ?? []) as ProviderRow[]) {
    providerInfo.set(row.id, {
      name: row.business_name ?? "—",
      email: row.contact_email,
    });
  }

  const subscriptions: SubscriptionRow[] = (
    (subsData ?? []) as RawSubscription[]
  ).map((sub) => {
    const start = sub.period_start ? new Date(sub.period_start) : null;
    const end = sub.period_end ? new Date(sub.period_end) : null;
    const meta = sub.metadata ?? {};
    const yearly =
      meta.yearly === true ||
      (start !== null &&
        end !== null &&
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) > 90);

    let amount = sub.amount_paid_egp ?? 0;
    if (amount === 0) {
      const catRow = catalog.get(sub.tier);
      if (catRow) {
        amount = yearly
          ? catRow.price_yearly_egp ?? 0
          : catRow.price_monthly_egp ?? 0;
      }
    }

    const info = providerInfo.get(sub.provider_id);
    return {
      id: sub.id,
      providerId: sub.provider_id,
      providerName: info?.name ?? "—",
      providerEmail: info?.email ?? null,
      tier: (sub.tier ?? "free") as SubscriptionRow["tier"],
      status: sub.status,
      gateway: sub.gateway,
      yearly,
      periodStart: sub.period_start,
      periodEnd: sub.period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      amountEgp: amount,
      source: (meta.source as string | undefined) ?? "",
    };
  });

  // MRR: yearly subs amortized over 12, monthly counted whole.
  const mrr = subscriptions.reduce(
    (acc, sub) =>
      acc + (sub.yearly ? Math.floor(sub.amountEgp / 12) : sub.amountEgp),
    0
  );

  const activeCount = subscriptions.length;
  const proCount = subscriptions.filter((s) => s.tier === "pro").length;
  const maxCount = subscriptions.filter((s) => s.tier === "max").length;

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <div className={s.pageBreadcrumb}>
            لوحة التحكم <span>/</span> الاشتراكات
          </div>
          <h1 className={s.pageTitle}>الاشتراكات والإيراد</h1>
          <p className={s.pageSubtitle}>
            متابعة الاشتراكات النشطة، الإيراد الشهري المتوقّع، ومصدر كل عملية.
          </p>
        </div>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div
            className={s.statIcon}
            style={{ background: "rgba(104,31,0,0.10)", color: "#681F00" }}
          >
            <CreditCard size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{activeCount}</div>
            <div className={s.statLabel}>اشتراك نشط</div>
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
            <div className={s.statValue}>{proCount}</div>
            <div className={s.statLabel}>على خطة Pro</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div
            className={s.statIcon}
            style={{ background: "rgba(217,119,6,0.12)", color: "#b45309" }}
          >
            <Crown size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{maxCount}</div>
            <div className={s.statLabel}>على خطة Max</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div
            className={s.statIcon}
            style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}
          >
            <Banknote size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>
              {mrr.toLocaleString("en-EG")} ج.م
            </div>
            <div className={s.statLabel}>الإيراد الشهري المتوقّع</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div
            className={s.statIcon}
            style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}
          >
            <TrendingUp size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>
              {subscriptions.filter((s) => s.yearly).length}
            </div>
            <div className={s.statLabel}>اشتراك سنوي</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div
            className={s.statIcon}
            style={{ background: "rgba(59,130,246,0.12)", color: "#2563eb" }}
          >
            <Repeat size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>
              {subscriptions.filter((s) => !s.yearly).length}
            </div>
            <div className={s.statLabel}>اشتراك شهري</div>
          </div>
        </div>
      </div>

      <SubscriptionsFilters subscriptions={subscriptions} />
    </div>
  );
}
