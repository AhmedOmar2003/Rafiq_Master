"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Search,
  X,
  ChevronDown,
  CreditCard,
  Crown,
  Repeat,
  CalendarRange,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import s from "../shared.module.css";

export type SubscriptionRow = {
  id: string;
  providerId: string;
  providerName: string;
  tier: "free" | "pro" | "max";
  status: string;
  gateway: string;
  yearly: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  amountEgp: number;
  source: string;
};

const TIER_OPTIONS = [
  { label: "كل الخطط", value: "all" },
  { label: "Pro", value: "pro" },
  { label: "Max", value: "max" },
];

const CYCLE_OPTIONS = [
  { label: "كل الدورات", value: "all" },
  { label: "شهري", value: "monthly" },
  { label: "سنوي", value: "yearly" },
];

const TIER_LABEL: Record<SubscriptionRow["tier"], string> = {
  free: "Free",
  pro: "Pro",
  max: "Max",
};

function gatewayLabel(gateway: string, source: string) {
  if (gateway === "manual") return source === "demo" ? "تجريبي" : "يدوي";
  if (gateway === "paymob") return "Paymob";
  if (gateway === "stripe") return "Stripe";
  return gateway;
}

export default function SubscriptionsFilters({
  subscriptions,
}: {
  subscriptions: SubscriptionRow[];
}) {
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<string>("all");
  const [cycle, setCycle] = useState<string>("all");
  const [tierOpen, setTierOpen] = useState(false);
  const [cycleOpen, setCycleOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subscriptions.filter((sub) => {
      if (tier !== "all" && sub.tier !== tier) return false;
      if (cycle === "yearly" && !sub.yearly) return false;
      if (cycle === "monthly" && sub.yearly) return false;
      if (!q) return true;
      return sub.providerName.toLowerCase().includes(q);
    });
  }, [subscriptions, search, tier, cycle]);

  const hasFilters = search || tier !== "all" || cycle !== "all";

  function clearAll() {
    setSearch("");
    setTier("all");
    setCycle("all");
  }

  return (
    <>
      <div className={s.filterBar}>
        <div className={s.searchWrapper}>
          <Search size={16} className={s.searchIcon} />
          <input
            type="text"
            placeholder="ابحث باسم النشاط..."
            value={search}
            className={s.searchInput}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={s.clearSearch} onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className={s.dropdownWrapper}>
          <button
            className={`${s.dropdownTrigger} ${tier !== "all" ? s.active : ""}`}
            onClick={() => setTierOpen((v) => !v)}
          >
            <Crown size={14} />
            {TIER_OPTIONS.find((o) => o.value === tier)?.label}
            <ChevronDown
              size={15}
              className={tierOpen ? s.chevronRotated : ""}
            />
          </button>
          {tierOpen && (
            <ul className={s.dropdownMenu}>
              {TIER_OPTIONS.map((opt) => (
                <li
                  key={opt.value}
                  className={`${s.dropdownItem} ${
                    tier === opt.value ? s.selected : ""
                  }`}
                  onClick={() => {
                    setTier(opt.value);
                    setTierOpen(false);
                  }}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={s.dropdownWrapper}>
          <button
            className={`${s.dropdownTrigger} ${
              cycle !== "all" ? s.active : ""
            }`}
            onClick={() => setCycleOpen((v) => !v)}
          >
            <Repeat size={14} />
            {CYCLE_OPTIONS.find((o) => o.value === cycle)?.label}
            <ChevronDown
              size={15}
              className={cycleOpen ? s.chevronRotated : ""}
            />
          </button>
          {cycleOpen && (
            <ul className={s.dropdownMenu}>
              {CYCLE_OPTIONS.map((opt) => (
                <li
                  key={opt.value}
                  className={`${s.dropdownItem} ${
                    cycle === opt.value ? s.selected : ""
                  }`}
                  onClick={() => {
                    setCycle(opt.value);
                    setCycleOpen(false);
                  }}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        {hasFilters && (
          <button className={s.clearAllBtn} onClick={clearAll}>
            <X size={13} /> مسح الكل
          </button>
        )}
        <span className={s.resultsCount}>{filtered.length} اشتراك</span>
      </div>

      <div className={s.tableCard}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>المشترك</th>
              <th>الخطة</th>
              <th>الدورة</th>
              <th>المبلغ</th>
              <th>المصدر</th>
              <th>ينتهي في</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={s.emptyState}>
                    <div className={s.emptyStateIcon}>
                      <CreditCard size={26} />
                    </div>
                    <span className={s.emptyStateTitle}>
                      لا توجد اشتراكات نشطة مطابقة
                    </span>
                    {hasFilters && (
                      <button className={s.clearAllBtn} onClick={clearAll}>
                        مسح الفلاتر
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((sub) => {
                const tierCls =
                  sub.tier === "max"
                    ? `${s.badge} ${s.badgeGold}`
                    : sub.tier === "pro"
                      ? `${s.badge} ${s.badgePurple}`
                      : `${s.badge} ${s.badgeGray}`;
                return (
                  <tr key={sub.id}>
                    <td>
                      <div className={s.infoCell}>
                        <div
                          className={s.avatar}
                          style={{
                            background: "rgba(104,31,0,0.10)",
                            color: "#681F00",
                          }}
                        >
                          {sub.providerName.slice(0, 1).toUpperCase()}
                        </div>
                        <div className={s.infoCellBody}>
                          <span className={s.infoCellTitle}>
                            {sub.providerName}
                          </span>
                          <span className={s.infoCellSub}>
                            {sub.status === "active"
                              ? "نشط"
                              : sub.status === "trialing"
                                ? "فترة تجريبية"
                                : sub.status === "past_due"
                                  ? "متأخر السداد"
                                  : sub.status}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={tierCls}>
                        <Crown size={11} />
                        {TIER_LABEL[sub.tier]}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Repeat size={13} style={{ color: "var(--color-gray)" }} />
                        {sub.yearly ? "سنوي" : "شهري"}
                      </span>
                    </td>
                    <td dir="ltr">
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontWeight: 600,
                        }}
                      >
                        <Wallet size={13} style={{ color: "var(--color-gray)" }} />
                        {sub.amountEgp.toLocaleString("en-EG")} ج.م
                      </span>
                    </td>
                    <td>
                      <span className={`${s.badge} ${s.badgeGray}`}>
                        {gatewayLabel(sub.gateway, sub.source)}
                      </span>
                      {sub.cancelAtPeriodEnd && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: "0.72rem",
                            color: "#d97706",
                            marginTop: 4,
                          }}
                        >
                          <AlertTriangle size={11} />
                          سيُلغى في نهاية الفترة
                        </div>
                      )}
                    </td>
                    <td dir="ltr">
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <CalendarRange
                          size={13}
                          style={{ color: "var(--color-gray)" }}
                        />
                        {sub.periodEnd
                          ? format(new Date(sub.periodEnd), "dd/MM/yyyy")
                          : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
