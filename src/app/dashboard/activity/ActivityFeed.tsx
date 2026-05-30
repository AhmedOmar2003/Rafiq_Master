"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search, X, Filter, ChevronDown, CheckCircle2, XCircle, Hourglass,
  CreditCard, UserPlus, Gavel, Activity as ActivityIcon, Trash2,
} from "lucide-react";
import s from "../shared.module.css";

export type ActivityKind =
  | "approve" | "reject" | "suspend" | "pending"
  | "subscription" | "signup" | "appeal";

export type ActivityRow = {
  id: string;
  kind: ActivityKind;
  title: string;
  subtitle?: string;
  detail?: string;
  createdAt: string;
};

const KIND_CFG: Record<ActivityKind, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  approve:      { label: "اعتماد",      color: "#16a34a", bg: "rgba(22,163,74,0.10)",  icon: CheckCircle2 },
  reject:       { label: "رفض",         color: "#dc2626", bg: "rgba(220,38,38,0.10)",  icon: XCircle },
  suspend:      { label: "تعليق",       color: "#6b7280", bg: "rgba(107,114,128,0.10)",icon: Trash2 },
  pending:      { label: "إعادة مراجعة",color: "#d97706", bg: "rgba(217,119,6,0.10)",  icon: Hourglass },
  subscription: { label: "اشتراك",      color: "#10b981", bg: "rgba(16,185,129,0.10)", icon: CreditCard },
  signup:       { label: "تسجيل",       color: "#2563eb", bg: "rgba(37,99,235,0.10)",  icon: UserPlus },
  appeal:       { label: "طعن",         color: "#7c3aed", bg: "rgba(124,58,237,0.10)", icon: Gavel },
};

const KIND_OPTIONS = [
  { label: "كل الأنواع", value: "all" as const },
  { label: "اعتمادات",    value: "approve" as const },
  { label: "رفض",          value: "reject" as const },
  { label: "اشتراكات",    value: "subscription" as const },
  { label: "تسجيلات",     value: "signup" as const },
  { label: "طعون",         value: "appeal" as const },
];

export default function ActivityFeed({ events }: { events: ActivityRow[] }) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | ActivityKind>("all");
  const [kindOpen, setKindOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (kind !== "all" && e.kind !== kind) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        (e.subtitle ?? "").toLowerCase().includes(q) ||
        (e.detail ?? "").toLowerCase().includes(q)
      );
    });
  }, [events, search, kind]);

  return (
    <>
      <div className={s.filterBar}>
        <div className={s.searchWrapper}>
          <Search size={16} className={s.searchIcon} />
          <input
            type="text"
            placeholder="ابحث في النشاط…"
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
            className={`${s.dropdownTrigger} ${kind !== "all" ? s.active : ""}`}
            onClick={() => setKindOpen((v) => !v)}
          >
            <Filter size={14} />
            {KIND_OPTIONS.find((o) => o.value === kind)?.label}
            <ChevronDown size={15} className={kindOpen ? s.chevronRotated : ""} />
          </button>
          {kindOpen && (
            <ul className={s.dropdownMenu}>
              {KIND_OPTIONS.map((opt) => (
                <li
                  key={opt.value}
                  className={`${s.dropdownItem} ${kind === opt.value ? s.selected : ""}`}
                  onClick={() => { setKind(opt.value); setKindOpen(false); }}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <span className={s.resultsCount}>{filtered.length} نشاط</span>
      </div>

      <div className={s.tableCard} style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div className={s.emptyState} style={{ padding: "3rem 1rem" }}>
            <div className={s.emptyStateIcon}>
              <ActivityIcon size={26} />
            </div>
            <span className={s.emptyStateTitle}>مفيش نشاط مطابق</span>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {filtered.map((ev, i) => {
              const cfg = KIND_CFG[ev.kind];
              const Icon = cfg.icon;
              return (
                <li
                  key={ev.id}
                  style={{
                    display: "flex",
                    gap: "1rem",
                    padding: "1rem 1.25rem",
                    borderTop: i === 0 ? "none" : "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: cfg.bg,
                      color: cfg.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.92rem",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {ev.title}
                      </span>
                      <span
                        className={s.badge}
                        style={{ background: cfg.bg, color: cfg.color, fontSize: "0.7rem" }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    {ev.subtitle && (
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--color-text-tertiary)",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ev.subtitle}
                      </div>
                    )}
                    {ev.detail && (
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--color-text-secondary)",
                          marginTop: 4,
                          background: "var(--color-background)",
                          padding: "0.5rem 0.75rem",
                          borderRadius: 8,
                          maxWidth: 600,
                        }}
                      >
                        {ev.detail}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      textAlign: "left",
                      fontSize: "0.75rem",
                      color: "var(--color-text-tertiary)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    <div title={format(new Date(ev.createdAt), "yyyy-MM-dd HH:mm:ss")}>
                      {formatDistanceToNow(new Date(ev.createdAt), { addSuffix: false })}
                    </div>
                    <div style={{ opacity: 0.7 }} dir="ltr">
                      {format(new Date(ev.createdAt), "HH:mm")}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
