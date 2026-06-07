"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  Search, X, ChevronDown, Gavel, Phone, Mail, MessageSquare, MapPin,
  CheckCircle2, XCircle, Hourglass, Store, ChevronRight, AlertCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/ui";
import s from "../shared.module.css";

export type AppealStatus = "pending" | "reviewing" | "resolved" | "rejected";

export type AppealRow = {
  id: string;
  placeId: number;
  placeName: string;
  placeStatus: string | null;
  placeRejectionReason: string | null;
  providerBusiness: string | null;
  providerEmail: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  message: string;
  status: AppealStatus;
  reviewerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  appealType: "place_rejection" | "place_edit_rejection";
  editSubmissionId: string | null;
  previousData: Record<string, unknown> | null;
  proposedData: Record<string, unknown> | null;
};

const STATUS_OPTIONS = [
  { label: "كل الحالات", value: "all" as const },
  { label: "في الانتظار", value: "pending" as const },
  { label: "قيد المراجعة", value: "reviewing" as const },
  { label: "تم الحل", value: "resolved" as const },
  { label: "مرفوض", value: "rejected" as const },
];

export default function AppealsList({
  appeals,
  setStatusAction,
}: {
  appeals: AppealRow[];
  setStatusAction: (
    id: string,
    status: AppealStatus,
    note?: string,
  ) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | AppealStatus>("all");
  const [statusOpen, setStatusOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appeals.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.placeName.toLowerCase().includes(q) ||
        a.contactName.toLowerCase().includes(q) ||
        a.contactPhone.includes(q) ||
        (a.contactEmail ?? "").toLowerCase().includes(q) ||
        (a.providerBusiness ?? "").toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q)
      );
    });
  }, [appeals, search, statusFilter]);

  const hasFilters = search || statusFilter !== "all";

  function update(id: string, next: AppealStatus, note?: string) {
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
            placeholder="ابحث باسم المكان، صاحب الطعن، رقم..."
            value={search}
            className={s.searchInput}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={s.clearSearch} onClick={() => setSearch("")} aria-label="مسح البحث">
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className={s.dropdownWrapper}>
          <button
            className={`${s.dropdownTrigger} ${statusFilter !== "all" ? s.active : ""}`}
            onClick={() => setStatusOpen((v) => !v)}
          >
            <Gavel size={14} />
            {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}
            <ChevronDown size={15} className={statusOpen ? s.chevronRotated : ""} />
          </button>
          {statusOpen && (
            <ul className={s.dropdownMenu}>
              {STATUS_OPTIONS.map((opt) => (
                <li
                  key={opt.value}
                  className={`${s.dropdownItem} ${statusFilter === opt.value ? s.selected : ""}`}
                  onClick={() => {
                    setStatusFilter(opt.value);
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
          <button
            className={s.clearAllBtn}
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
          >
            <X size={13} /> مسح الكل
          </button>
        )}
        <span className={s.resultsCount}>{filtered.length} طعن</span>
      </div>

      {/* List of appeal cards — each row expands inline for the full detail */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {filtered.length === 0 ? (
          <div className={s.tableCard}>
            <div className={s.emptyState}>
              <div className={s.emptyStateIcon}>
                <Gavel size={26} />
              </div>
              <span className={s.emptyStateTitle}>لا توجد طعون مطابقة</span>
              {hasFilters && (
                <button
                  className={s.clearAllBtn}
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                >
                  مسح الفلاتر
                </button>
              )}
            </div>
          </div>
        ) : (
          filtered.map((a) => {
            const isOpen = expanded === a.id;
            return (
              <AppealCard
                key={a.id}
                appeal={a}
                isOpen={isOpen}
                onToggle={() => setExpanded(isOpen ? null : a.id)}
                noteValue={noteDraft[a.id] ?? a.reviewerNote ?? ""}
                onNoteChange={(v) =>
                  setNoteDraft((m) => ({ ...m, [a.id]: v }))
                }
                onSetStatus={(next) =>
                  update(a.id, next, noteDraft[a.id] ?? a.reviewerNote ?? "")
                }
                pending={isPending}
              />
            );
          })
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Single appeal card — collapsed shows the essentials, expanded shows the
// full message + contact + admin actions.
// ---------------------------------------------------------------------------
function AppealCard({
  appeal,
  isOpen,
  onToggle,
  noteValue,
  onNoteChange,
  onSetStatus,
  pending,
}: {
  appeal: AppealRow;
  isOpen: boolean;
  onToggle: () => void;
  noteValue: string;
  onNoteChange: (v: string) => void;
  onSetStatus: (status: AppealStatus) => void;
  pending: boolean;
}) {
  return (
    <div className={s.tableCard} style={{ padding: 0 }}>
      {/* Header (always visible, clickable) */}
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={`${appeal.contactName} — ${isOpen ? "إغلاق" : "عرض التفاصيل"}`}
        style={{
          width: "100%", background: "none", border: "none",
          padding: "1.1rem 1.25rem", cursor: "pointer",
          textAlign: "right", display: "flex",
          alignItems: "center", gap: "0.85rem",
        }}
      >
        <div className={`${s.statIcon} ${s.statIconPrimary}`} style={{ flexShrink: 0 }}>
          <Gavel size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 2 }}>
            <span
              style={{
                fontWeight: 800, fontSize: "0.95rem",
                overflow: "hidden", textOverflow: "ellipsis",
                whiteSpace: "nowrap", maxWidth: 380,
              }}
            >
              {appeal.contactName}
            </span>
            <span
              className={s.badge}
              style={{
                background:
                  appeal.appealType === "place_edit_rejection"
                    ? "rgba(37,99,235,0.10)"
                    : "rgba(217,119,6,0.10)",
                color:
                  appeal.appealType === "place_edit_rejection"
                    ? "#1d4ed8"
                    : "#92400e",
              }}
            >
              {appeal.appealType === "place_edit_rejection"
                ? "طعن على رفض تعديل"
                : "طعن على رفض مكان"}
            </span>
            <StatusBadge status={appeal.status} />
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--color-gray)",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              flexWrap: "wrap",
            }}
          >
            <MapPin size={12} /> {appeal.placeName}
            <span style={{ color: "var(--color-gray-light)" }}>·</span>
            <Phone size={12} /> <span dir="ltr">{appeal.contactPhone}</span>
            <span style={{ color: "var(--color-gray-light)" }}>·</span>
            {format(new Date(appeal.createdAt), "dd/MM HH:mm")}
          </div>
        </div>
        <ChevronRight
          size={18}
          style={{
            color: "var(--color-gray)",
            transform: isOpen ? "rotate(-90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.1rem",
          }}
        >
          {/* Original rejection reason */}
          {appeal.placeRejectionReason && (
            <div
              style={{
                padding: "0.85rem 1rem",
                background: "rgba(220,38,38,0.06)",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(220,38,38,0.18)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  marginBottom: 4,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "#dc2626",
                }}
              >
                <AlertCircle size={14} />
                سبب الرفض الأصلي
              </div>
              <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.7 }}>
                {appeal.placeRejectionReason}
              </p>
            </div>
          )}

          {appeal.appealType === "place_edit_rejection" &&
            appeal.previousData &&
            appeal.proposedData && (
              <div>
                <div
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    marginBottom: "0.65rem",
                  }}
                >
                  التغييرات محل الطعن
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(230px, 1fr))",
                    gap: "0.65rem",
                  }}
                >
                  {APPEAL_EDIT_FIELDS.map((field) => {
                    const oldValue = appealValue(
                      appeal.previousData?.[field.key],
                    );
                    const newValue = appealValue(
                      appeal.proposedData?.[field.key],
                    );
                    if (oldValue === newValue) return null;
                    return (
                      <div
                        key={field.key}
                        style={{
                          border: "1px solid var(--color-border)",
                          borderRadius: "10px",
                          padding: "0.75rem",
                        }}
                      >
                        <strong style={{ fontSize: "0.8rem" }}>
                          {field.label}
                        </strong>
                        <div
                          style={{
                            marginTop: 5,
                            color: "var(--color-gray)",
                            fontSize: "0.78rem",
                            textDecoration: "line-through",
                          }}
                        >
                          {oldValue}
                        </div>
                        <div style={{ marginTop: 5, fontSize: "0.86rem" }}>
                          {newValue}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* The appeal message */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                marginBottom: 6,
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--color-gray)",
              }}
            >
              <MessageSquare size={14} />
              نص الطعن
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.92rem",
                lineHeight: 1.85,
                background: "var(--color-background)",
                padding: "0.85rem 1rem",
                borderRadius: "var(--radius-md)",
                whiteSpace: "pre-wrap",
              }}
            >
              {appeal.message}
            </p>
          </div>

          {/* Contact + provider info */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <InfoChip icon={<Store size={14} />} label="النشاط" value={appeal.providerBusiness ?? "—"} />
            <InfoChip
              icon={<Phone size={14} />}
              label="موبايل التواصل"
              value={appeal.contactPhone}
              href={`tel:${appeal.contactPhone}`}
            />
            {appeal.contactEmail && (
              <InfoChip
                icon={<Mail size={14} />}
                label="إيميل التواصل"
                value={appeal.contactEmail}
                href={`mailto:${appeal.contactEmail}`}
              />
            )}
            <InfoChip
              icon={<MessageSquare size={14} />}
              label="واتساب"
              value={appeal.contactPhone}
              href={`https://wa.me/2${appeal.contactPhone.replace(/^\+?/, "")}`}
            />
          </div>

          {/* Reviewer note + actions */}
          <div>
            <label
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--color-gray)",
                display: "block",
                marginBottom: 6,
              }}
            >
              ملاحظات المراجعة (اختياري)
            </label>
            <textarea
              value={noteValue}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={2}
              dir="rtl"
              placeholder="مثال: اتصلت بصاحب النشاط وأعدت اعتماد المكان..."
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "1.5px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.88rem",
                fontFamily: "inherit",
                lineHeight: 1.6,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <ActionButton
              icon={<Hourglass size={15} />}
              label="قيد المراجعة"
              color="#2563eb"
              disabled={pending || appeal.status === "reviewing"}
              onClick={() => onSetStatus("reviewing")}
            />
            <ActionButton
              icon={<CheckCircle2 size={15} />}
              label="تم الحل"
              color="#10b981"
              disabled={pending || appeal.status === "resolved"}
              onClick={() => onSetStatus("resolved")}
            />
            <ActionButton
              icon={<XCircle size={15} />}
              label="رفض الطعن"
              color="#dc2626"
              disabled={pending || appeal.status === "rejected"}
              onClick={() => onSetStatus("rejected")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const APPEAL_EDIT_FIELDS = [
  { key: "place_name", label: "اسم المكان" },
  { key: "activity_name", label: "النشاط" },
  { key: "budget", label: "الميزانية" },
  { key: "price_range", label: "السعر" },
  { key: "place_address", label: "العنوان" },
  { key: "city_name", label: "المدينة" },
  { key: "description", label: "الوصف" },
  { key: "image_path", label: "الصورة" },
] as const;

function appealValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function InfoChip({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div
      style={{
        background: "var(--color-background)",
        borderRadius: "var(--radius-md)",
        padding: "0.65rem 0.85rem",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span
        style={{
          fontSize: "0.72rem",
          color: "var(--color-gray)",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: "0.3rem",
        }}
      >
        {icon}
        {label}
      </span>
      <span
        dir="ltr"
        style={{
          fontSize: "0.86rem",
          fontWeight: 700,
          color: "var(--color-text)",
          textAlign: "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
  if (!href) return inner;
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      style={{ textDecoration: "none" }}
    >
      {inner}
    </a>
  );
}

function ActionButton({
  icon,
  label,
  color,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: `${color}18`,
        color,
        border: `1.5px solid ${color}40`,
        padding: "0.55rem 1rem",
        borderRadius: "var(--radius-md)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontWeight: 700,
        fontSize: "0.84rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        transition: "background 0.2s",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

