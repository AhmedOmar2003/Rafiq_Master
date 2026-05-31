"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  Search, X, ChevronDown, ShieldAlert, MapPin, User, Mail, Hourglass,
  CheckCircle2, XCircle, ChevronRight, AlertCircle, Eye,
} from "lucide-react";
import s from "../shared.module.css";

export type ReportStatus = "open" | "reviewed" | "actioned" | "dismissed";

export type ReportRow = {
  id: string;
  reporterName: string;
  reporterEmail: string | null;
  reporterKind: "regular_user" | "provider_user" | "unknown";
  targetType: "place" | "review" | "provider" | "user";
  targetId: string;
  targetName: string;
  reasonCode: string;
  details: string | null;
  status: ReportStatus;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

const REASON_LABELS: Record<string, string> = {
  spam: "إعلانات مزعجة",
  offensive: "محتوى مسيء",
  off_topic: "خارج الموضوع",
  fake: "معلومات مزيفة",
  illegal: "محتوى غير قانوني",
  harassment: "تحرش",
  other: "أخرى",
};

const STATUS_OPTIONS = [
  { label: "كل الحالات", value: "all" as const },
  { label: "مفتوح", value: "open" as const },
  { label: "تمت المراجعة", value: "reviewed" as const },
  { label: "تم اتخاذ إجراء", value: "actioned" as const },
  { label: "مرفوض", value: "dismissed" as const },
];

const STATUS_CFG: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  open:      { label: "مفتوح",            color: "#d97706", bg: "rgba(217,119,6,0.10)" },
  reviewed:  { label: "تمت المراجعة",     color: "#2563eb", bg: "rgba(37,99,235,0.10)" },
  actioned:  { label: "تم اتخاذ إجراء",   color: "#16a34a", bg: "rgba(22,163,74,0.10)" },
  dismissed: { label: "مرفوض",             color: "#6b7280", bg: "rgba(107,114,128,0.10)" },
};

const REPORTER_KIND_LABEL: Record<ReportRow["reporterKind"], string> = {
  regular_user: "مستخدم فقط",
  provider_user: "مستخدم + مقدم خدمة",
  unknown: "غير معروف",
};

export default function ReportsList({
  reports,
  setStatusAction,
}: {
  reports: ReportRow[];
  setStatusAction: (id: string, status: ReportStatus, note?: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReportStatus>("all");
  const [statusOpen, setStatusOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.reporterName.toLowerCase().includes(q) ||
        r.targetName.toLowerCase().includes(q) ||
        REASON_LABELS[r.reasonCode]?.toLowerCase().includes(q) ||
        (r.details ?? "").toLowerCase().includes(q)
      );
    });
  }, [reports, search, statusFilter]);

  function update(id: string, next: ReportStatus, note?: string) {
    startTransition(async () => {
      await setStatusAction(id, next, note);
      setExpanded(null);
    });
  }

  return (
    <>
      <div className={s.filterBar}>
        <div className={s.searchWrapper}>
          <Search size={16} className={s.searchIcon} />
          <input
            type="text"
            placeholder="ابحث في البلاغات…"
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
            className={`${s.dropdownTrigger} ${statusFilter !== "all" ? s.active : ""}`}
            onClick={() => setStatusOpen((v) => !v)}
          >
            <ShieldAlert size={14} />
            {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}
            <ChevronDown size={15} className={statusOpen ? s.chevronRotated : ""} />
          </button>
          {statusOpen && (
            <ul className={s.dropdownMenu}>
              {STATUS_OPTIONS.map((opt) => (
                <li
                  key={opt.value}
                  className={`${s.dropdownItem} ${statusFilter === opt.value ? s.selected : ""}`}
                  onClick={() => { setStatusFilter(opt.value); setStatusOpen(false); }}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <span className={s.resultsCount}>{filtered.length} بلاغ</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {filtered.length === 0 ? (
          <div className={s.tableCard}>
            <div className={s.emptyState}>
              <div className={s.emptyStateIcon}>
                <ShieldAlert size={26} />
              </div>
              <span className={s.emptyStateTitle}>لا توجد بلاغات مطابقة</span>
            </div>
          </div>
        ) : (
          filtered.map((r) => {
            const isOpen = expanded === r.id;
            const cfg = STATUS_CFG[r.status];
            return (
              <div key={r.id} className={s.tableCard} style={{ padding: 0 }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                  style={{
                    width: "100%", background: "none", border: "none",
                    padding: "1rem 1.25rem", cursor: "pointer", textAlign: "right",
                    display: "flex", alignItems: "center", gap: "0.85rem",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: cfg.bg, color: cfg.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <ShieldAlert size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 2 }}>
                      <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                        {REASON_LABELS[r.reasonCode] ?? r.reasonCode}
                      </span>
                      <span className={s.badge} style={{ background: cfg.bg, color: cfg.color, fontSize: "0.7rem" }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div style={{
                      fontSize: "0.8rem", color: "var(--color-text-tertiary)",
                      display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap",
                    }}>
                      <User size={12} /> {r.reporterName}
                      {r.reporterEmail && (
                        <>
                          <span style={{ opacity: 0.5 }}>·</span>
                          <span dir="ltr">{r.reporterEmail}</span>
                        </>
                      )}
                      <span style={{ opacity: 0.5 }}>·</span>
                      <span>{REPORTER_KIND_LABEL[r.reporterKind]}</span>
                      <span style={{ opacity: 0.5 }}>·</span>
                      {r.targetType === "place" ? <MapPin size={12} /> : <AlertCircle size={12} />}
                      {r.targetName}
                      <span style={{ opacity: 0.5 }}>·</span>
                      {format(new Date(r.createdAt), "dd/MM HH:mm")}
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    style={{
                      color: "var(--color-text-tertiary)",
                      transform: isOpen ? "rotate(-90deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>

                {isOpen && (
                  <div style={{
                    borderTop: "1px solid var(--color-border)",
                    padding: "1.25rem",
                    display: "flex", flexDirection: "column", gap: "1rem",
                  }}>
                    <div
                      style={{
                        display: "grid",
                        gap: "0.75rem",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      }}
                    >
                      <div
                        style={{
                          background: "var(--color-background)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          padding: "0.85rem 1rem",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            color: "var(--color-text-tertiary)",
                            marginBottom: 6,
                          }}
                        >
                          المبلّغ
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <User size={13} />
                            {r.reporterName}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <Mail size={13} />
                            <span dir="ltr">{r.reporterEmail ?? "لا يوجد إيميل محفوظ"}</span>
                          </span>
                          <span className={s.badge} style={{ width: "fit-content" }}>
                            {REPORTER_KIND_LABEL[r.reporterKind]}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          background: "var(--color-background)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          padding: "0.85rem 1rem",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            color: "var(--color-text-tertiary)",
                            marginBottom: 6,
                          }}
                        >
                          العنصر المُبلّغ عنه
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <span>{r.targetName}</span>
                          <span style={{ color: "var(--color-text-tertiary)", fontSize: "0.82rem" }}>
                            النوع: {r.targetType}
                          </span>
                        </div>
                      </div>
                    </div>

                    {r.details && (
                      <div>
                        <div style={{
                          fontSize: "0.78rem", fontWeight: 700,
                          color: "var(--color-text-tertiary)", marginBottom: 6,
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                          <Eye size={14} />
                          تفاصيل البلاغ
                        </div>
                        <p style={{
                          margin: 0, fontSize: "0.9rem", lineHeight: 1.85,
                          background: "var(--color-background)",
                          padding: "0.85rem 1rem",
                          borderRadius: "var(--radius-md)",
                          whiteSpace: "pre-wrap",
                        }}>
                          {r.details}
                        </p>
                      </div>
                    )}

                    {r.resolutionNote && (
                      <div style={{
                        padding: "0.75rem 1rem",
                        background: "var(--color-primary-subtle)",
                        borderRadius: "var(--radius-md)",
                        fontSize: "0.85rem",
                      }}>
                        <strong>ملاحظة المراجعة:</strong> {r.resolutionNote}
                      </div>
                    )}

                    <div>
                      <label style={{
                        fontSize: "0.78rem", fontWeight: 700,
                        color: "var(--color-text-tertiary)",
                        display: "block", marginBottom: 6,
                      }}>
                        أضف ملاحظة (اختياري)
                      </label>
                      <textarea
                        value={noteDraft[r.id] ?? r.resolutionNote ?? ""}
                        onChange={(e) => setNoteDraft((m) => ({ ...m, [r.id]: e.target.value }))}
                        rows={2}
                        dir="rtl"
                        placeholder="مثال: حذفنا المكان وتواصلنا مع الـ provider..."
                        style={{
                          width: "100%", padding: "0.75rem 1rem",
                          border: "1.5px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          fontSize: "0.88rem", fontFamily: "inherit", lineHeight: 1.6,
                          outline: "none", resize: "vertical", boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                      <Btn icon={<Hourglass size={15} />} label="تمت المراجعة" color="#2563eb"
                        disabled={isPending || r.status === "reviewed"}
                        onClick={() => update(r.id, "reviewed", noteDraft[r.id] ?? r.resolutionNote ?? "")} />
                      <Btn icon={<CheckCircle2 size={15} />} label="تم اتخاذ إجراء" color="#16a34a"
                        disabled={isPending || r.status === "actioned"}
                        onClick={() => update(r.id, "actioned", noteDraft[r.id] ?? r.resolutionNote ?? "")} />
                      <Btn icon={<XCircle size={15} />} label="رفض البلاغ" color="#dc2626"
                        disabled={isPending || r.status === "dismissed"}
                        onClick={() => update(r.id, "dismissed", noteDraft[r.id] ?? r.resolutionNote ?? "")} />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function Btn({
  icon, label, color, disabled, onClick,
}: {
  icon: React.ReactNode; label: string; color: string;
  disabled: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: `${color}18`, color, border: `1.5px solid ${color}40`,
      padding: "0.55rem 1rem", borderRadius: "var(--radius-md)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontWeight: 700, fontSize: "0.84rem",
      display: "inline-flex", alignItems: "center", gap: "0.4rem",
    }}>
      {icon}
      {label}
    </button>
  );
}
