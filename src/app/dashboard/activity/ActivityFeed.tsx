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
  approve:      { label: "اعتماد",      color: "var(--color-success)", bg: "var(--color-success-bg)", icon: CheckCircle2 },
  reject:       { label: "رفض",         color: "var(--color-error)", bg: "var(--color-error-bg)", icon: XCircle },
  suspend:      { label: "تعليق",       color: "var(--color-text-tertiary)", bg: "var(--color-surface-disabled)", icon: Trash2 },
  pending:      { label: "إعادة مراجعة",color: "var(--color-warning)", bg: "var(--color-warning-bg)", icon: Hourglass },
  subscription: { label: "اشتراك",      color: "var(--color-success)", bg: "var(--color-success-bg)", icon: CreditCard },
  signup:       { label: "تسجيل",       color: "var(--color-info)", bg: "var(--color-info-bg)", icon: UserPlus },
  appeal:       { label: "طعن",         color: "var(--color-secondary)", bg: "var(--color-secondary-alpha)", icon: Gavel },
  review:       { label: "تقييم",       color: "var(--color-warning)", bg: "var(--color-warning-bg)", icon: Star },
  report:       { label: "بلاغ",        color: "var(--color-error)", bg: "var(--color-error-bg)", icon: Siren },
  campaign:     { label: "إعلان",       color: "var(--color-info)", bg: "var(--color-info-bg)", icon: Megaphone },
  place_open:   { label: "مشاهدة",      color: "var(--color-secondary)", bg: "var(--color-secondary-alpha)", icon: ActivityIcon },
  favorite:     { label: "مفضلة",       color: "var(--color-error)", bg: "var(--color-error-bg)", icon: Heart },
  map_open:     { label: "خريطة",       color: "var(--color-secondary)", bg: "var(--color-secondary-alpha)", icon: Navigation },
  campaign_click:{ label: "نقرة إعلان", color: "var(--color-primary)", bg: "var(--color-primary-alpha)", icon: MousePointerClick },
  campaign_impression:{ label: "ظهور إعلان", color: "var(--color-secondary)", bg: "var(--color-secondary-alpha)", icon: Megaphone },
  admin_action: { label: "إجراء إداري", color: "var(--color-text-secondary)", bg: "var(--color-surface-disabled)", icon: ActivityIcon },
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
                          fontSize: "0.85rem",
                          color: "var(--color-text-secondary)",
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
                          fontSize: "0.85rem",
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
                      fontSize: "0.85rem",
                      color: "var(--color-text-secondary)",
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
