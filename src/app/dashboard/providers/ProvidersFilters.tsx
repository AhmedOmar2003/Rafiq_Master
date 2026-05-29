"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Search,
  X,
  ChevronDown,
  Store,
  Mail,
  Phone,
  MapPin,
  Crown,
  CalendarDays,
} from "lucide-react";
import s from "../shared.module.css";

export type ProviderRow = {
  id: string;
  ownerId: string | null;
  businessName: string;
  contactEmail: string;
  contactPhone: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  createdAt: string;
  tier: "free" | "pro" | "max";
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  placeCount: number;
};

const TIER_OPTIONS = [
  { label: "كل الخطط", value: "all" },
  { label: "Free", value: "free" },
  { label: "Pro", value: "pro" },
  { label: "Max", value: "max" },
];

const STATUS_OPTIONS = [
  { label: "كل الحالات", value: "all" },
  { label: "قيد المراجعة", value: "pending" },
  { label: "معتمد", value: "approved" },
  { label: "معلّق", value: "suspended" },
  { label: "مرفوض", value: "rejected" },
];

const TIER_BADGE: Record<ProviderRow["tier"], string> = {
  free: `${"badge"} badgeGray`,
  pro: `badge badgePurple`,
  max: `badge badgeGold`,
};

const TIER_LABEL: Record<ProviderRow["tier"], string> = {
  free: "Free",
  pro: "Pro",
  max: "Max",
};

const STATUS_BADGE: Record<ProviderRow["status"], string> = {
  approved: "badgeSuccess",
  pending: "badgeGold",
  suspended: "badgeDanger",
  rejected: "badgeDanger",
};

const STATUS_LABEL: Record<ProviderRow["status"], string> = {
  approved: "معتمد",
  pending: "قيد المراجعة",
  suspended: "معلّق",
  rejected: "مرفوض",
};

export default function ProvidersFilters({
  providers,
}: {
  providers: ProviderRow[];
}) {
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [tierOpen, setTierOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return providers.filter((p) => {
      if (tier !== "all" && p.tier !== tier) return false;
      if (status !== "all" && p.status !== status) return false;
      if (!q) return true;
      return (
        p.businessName.toLowerCase().includes(q) ||
        p.contactEmail.toLowerCase().includes(q) ||
        (p.contactPhone ?? "").toLowerCase().includes(q)
      );
    });
  }, [providers, search, tier, status]);

  const hasFilters = search || tier !== "all" || status !== "all";

  function clearAll() {
    setSearch("");
    setTier("all");
    setStatus("all");
  }

  return (
    <>
      <div className={s.filterBar}>
        <div className={s.searchWrapper}>
          <Search size={16} className={s.searchIcon} />
          <input
            type="text"
            placeholder="ابحث باسم النشاط أو الإيميل أو رقم التليفون..."
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
            {TIER_OPTIONS.find((t) => t.value === tier)?.label}
            <ChevronDown size={15} className={tierOpen ? s.chevronRotated : ""} />
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
              status !== "all" ? s.active : ""
            }`}
            onClick={() => setStatusOpen((v) => !v)}
          >
            <Store size={14} />
            {STATUS_OPTIONS.find((o) => o.value === status)?.label}
            <ChevronDown
              size={15}
              className={statusOpen ? s.chevronRotated : ""}
            />
          </button>
          {statusOpen && (
            <ul className={s.dropdownMenu}>
              {STATUS_OPTIONS.map((opt) => (
                <li
                  key={opt.value}
                  className={`${s.dropdownItem} ${
                    status === opt.value ? s.selected : ""
                  }`}
                  onClick={() => {
                    setStatus(opt.value);
                    setStatusOpen(false);
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
        <span className={s.resultsCount}>{filtered.length} مزوّد</span>
      </div>

      <div className={s.tableCard}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>النشاط</th>
              <th>التواصل</th>
              <th>الخطة الحالية</th>
              <th>الحالة</th>
              <th>الأماكن</th>
              <th>تاريخ الانضمام</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={s.emptyState}>
                    <div className={s.emptyStateIcon}>
                      <Store size={26} />
                    </div>
                    <span className={s.emptyStateTitle}>
                      لا يوجد مزوّدون مطابقون
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
              filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className={s.infoCell}>
                      <div
                        className={s.avatar}
                        style={{
                          background: "rgba(104,31,0,0.10)",
                          color: "#681F00",
                        }}
                      >
                        {p.businessName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className={s.infoCellBody}>
                        <span className={s.infoCellTitle}>{p.businessName}</span>
                        <span className={s.infoCellSub}>{p.contactEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Mail size={13} style={{ color: "var(--color-gray)" }} />
                        <span dir="ltr">{p.contactEmail}</span>
                      </span>
                      {p.contactPhone && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Phone size={13} style={{ color: "var(--color-gray)" }} />
                          <span dir="ltr">{p.contactPhone}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <TierBadge tier={p.tier} />
                    {p.cancelAtPeriodEnd && (
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#d97706",
                          marginTop: 4,
                        }}
                      >
                        سيُلغى في نهاية الفترة
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <MapPin size={13} style={{ color: "var(--color-gray)" }} />
                      {p.placeCount}
                    </span>
                  </td>
                  <td dir="ltr">
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <CalendarDays size={13} style={{ color: "var(--color-gray)" }} />
                      {format(new Date(p.createdAt), "dd/MM/yyyy")}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// CSS modules can't have dynamic keys, so we resolve the class name lazily.
// This keeps the badge styling consistent with the rest of the dashboard.
function TierBadge({ tier }: { tier: ProviderRow["tier"] }) {
  // The TIER_BADGE map above is just for reference — we set classes inline
  // here because `s` module class names get hashed and can't be string-built.
  const cls =
    tier === "max"
      ? `${s.badge} ${s.badgeGold}`
      : tier === "pro"
        ? `${s.badge} ${s.badgePurple}`
        : `${s.badge} ${s.badgeGray}`;
  return (
    <span className={cls}>
      <Crown size={11} />
      {TIER_LABEL[tier]}
    </span>
  );
}

function StatusBadge({ status }: { status: ProviderRow["status"] }) {
  const cls =
    status === "approved"
      ? `${s.badge} ${s.badgeSuccess}`
      : status === "pending"
        ? `${s.badge} ${s.badgeGold}`
        : `${s.badge} ${s.badgeDanger}`;
  return <span className={cls}>{STATUS_LABEL[status]}</span>;
}

// Re-export the constant maps so the page-level file can stay typed without
// pulling from inside this client component module.
export { TIER_BADGE, STATUS_BADGE };
