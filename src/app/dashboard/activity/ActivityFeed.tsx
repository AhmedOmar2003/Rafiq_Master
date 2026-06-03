"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search, X, Filter, ChevronDown, CheckCircle2, XCircle, Hourglass,
  CreditCard, UserPlus, Gavel, Activity as ActivityIcon, Trash2, Star,
  Siren, Megaphone, Heart, Navigation, MousePointerClick,
} from "lucide-react";
import s from "../shared.module.css";

export type ActivityKind =
  | "approve" | "reject" | "suspend" | "pending"
  | "subscription" | "signup" | "appeal"
  | "review" | "report" | "campaign" | "place_open"
  | "favorite" | "map_open" | "campaign_click"
  | "campaign_impression" | "admin_action";

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
  review:       { label: "تقييم",       color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: Star },
  report:       { label: "بلاغ",        color: "#ef4444", bg: "rgba(239,68,68,0.12)",  icon: Siren },
  campaign:     { label: "إعلان",       color: "#681F00", bg: "rgba(104,31,0,0.10)",   icon: Megaphone },
  place_open:   { label: "مشاهدة",      color: "#0f766e", bg: "rgba(15,118,110,0.12)", icon: ActivityIcon },
  favorite:     { label: "مفضلة",       color: "#db2777", bg: "rgba(219,39,119,0.12)", icon: Heart },
  map_open:     { label: "خريطة",       color: "#0284c7", bg: "rgba(2,132,199,0.12)",  icon: Navigation },
  campaign_click:{ label: "نقرة إعلان", color: "#9333ea", bg: "rgba(147,51,234,0.12)", icon: MousePointerClick },
  campaign_impression:{ label: "ظهور إعلان", color: "#7c3aed", bg: "rgba(124,58,237,0.12)", icon: Megaphone },
  admin_action: { label: "إجراء إداري", color: "#4b5563", bg: "rgba(75,85,99,0.12)", icon: ActivityIcon },
};

const KIND_OPTIONS = [
  { label: "كل الأنواع", value: "all" as const },
  { label: "اعتمادات",    value: "approve" as const },
  { label: "رفض",          value: "reject" as const },
  { label: "اشتراكات",    value: "subscription" as const },
  { label: "تسجيلات",     value: "signup" as const },
  { label: "طعون",         value: "appeal" as const },
  { label: "تقييمات",      value: "review" as const },
  { label: "بلاغات",       value: "report" as const },
  { label: "إعلانات",      value: "campaign" as const },
  { label: "مشاهدات الأماكن", value: "place_open" as const },
  { label: "المفضلة",      value: "favorite" as const },
  { label: "الخريطة",      value: "map_open" as const },
  { label: "نقرات الإعلانات", value: "campaign_click" as const },
  { label: "ظهور الإعلانات", value: "campaign_impression" as const },
  { label: "إجراءات الأدمن", value: "admin_action" as const },
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
            placeholder="دوّر في النشاط..."
            value={search}
            className={s.searchInput}
            aria-label="ابحث في النشاط"
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className={s.clearSearch}
              aria-label="امسح البحث"
              onClick={() => setSearch("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className={s.dropdownWrapper}>
          <button
            type="button"
            className={`${s.dropdownTrigger} ${kind !== "all" ? s.active : ""}`}
            onClick={() => setKindOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={kindOpen}
            aria-label="فلتر نوع النشاط"
          >
            <Filter size={14} />
            {KIND_OPTIONS.find((o) => o.value === kind)?.label}
            <ChevronDown size={15} className={kindOpen ? s.chevronRotated : ""} />
          </button>
          {kindOpen && (
            <ul className={s.dropdownMenu} role="listbox" aria-label="أنواع النشاط">
              {KIND_OPTIONS.map((opt) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={kind === opt.value}
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
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label="سجل النشاط">
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
                      fontSize: "0.82rem",
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
