"use client";

import { useState, useMemo, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Edit3, Trash2, Search, X, ChevronDown, Star, MapPin, Utensils, PartyPopper, Building2, Activity, Dices, Wallet, CheckCircle2, XCircle, Hourglass, Store, Mail, ShieldCheck, Filter } from "lucide-react";
import s from "../shared.module.css";
import ConfirmDestructiveButton from "../ConfirmDestructiveButton";

type PlaceStatus = "pending" | "under_review" | "approved" | "rejected" | "suspended";

type PlaceEditSubmission = {
  id: string;
  status: "pending" | "approved" | "rejected" | "appealed" | "cancelled";
  previous_data: Record<string, unknown>;
  proposed_data: Record<string, unknown>;
  provider_note: string | null;
  rejection_reason: string | null;
  submitted_at: string;
  review_due_at: string;
  reviewed_at: string | null;
};

type PlaceRow = {
  id: string;
  place_name: string;
  city_name: string;
  activity_name: string;
  rating: number;
  budget: string;
  image_path: string | null;
  status?: PlaceStatus | null;
  created_at?: string;
  rejection_reason?: string | null;
  /** Business name of the provider who created the place. */
  owner_business?: string | null;
  /** Provider's contact email — falls back to the auth account email. */
  owner_email?: string | null;
  /** Owner's full name from the profile (often the human behind the business). */
  owner_name?: string | null;
  /** When null the place was added by an admin from the dashboard. */
  provider_id?: string | null;
  /** True when the admin opened the "edit & resubmit" door on a rejected
   * place. Only meaningful while status === 'rejected'. */
  edit_allowed?: boolean | null;
  edit_request_status?: string | null;
  edit_request_note?: string | null;
  edit_request_response?: string | null;
  edit_request_requested_at?: string | null;
  edit_request_reviewed_at?: string | null;
  edit_submitted_at?: string | null;
  analytics_views?: number;
  analytics_favorites?: number;
  analytics_map_clicks?: number;
  analytics_interactions?: number;
  campaign_count?: number;
  pending_campaign_count?: number;
  edit_submission?: PlaceEditSubmission | null;
};

const SOURCE_OPTIONS = [
  { label: "كل المصادر", value: "all" as const },
  { label: "أُضيف بواسطة الأدمن", value: "admin" as const },
  { label: "أُضيف بواسطة مقدّم خدمة", value: "provider" as const },
];

// ── Fixed data from Flutter stepper ─────────────────────────────────────────

const ACTIVITY_OPTIONS = [
  { label: "الكل",    value: "الكل",    icon: Search },
  { label: "طعام",    value: "طعام",    icon: Utensils },
  { label: "ترفيه",   value: "ترفيه",   icon: PartyPopper },
  { label: "سياحي",   value: "سياحي",   icon: Building2 },
  { label: "رياضة",   value: "رياضة",   icon: Activity },
  { label: "فاجئني",  value: "فاجئني",  icon: Dices },
];

const BUDGET_OPTIONS = [
  { label: "الكل",                value: "الكل" },
  { label: "أقل من 100 جنيه",    value: "أقل من 100 جنيه" },
  { label: "100 إلى 500 جنيه",   value: "100 إلى 500 جنيه" },
  { label: "500 إلى 1000 جنيه",  value: "500 إلى 1000 جنيه" },
  { label: "1000 إلى 1500 جنيه", value: "1000 إلى 1500 جنيه" },
  { label: "لسه محددتش",         value: "لسه محددتش" },
];

const RATING_OPTIONS = [
  { label: "الكل",       value: 0 },
  { label: "1 ★ فأكثر", value: 1 },
  { label: "2 ★ فأكثر", value: 2 },
  { label: "3 ★ فأكثر", value: 3 },
  { label: "4 ★ فأكثر", value: 4 },
];

const ACTIVITY_COLORS: Record<string, string> = {
  طعام: "#D9A441",
  ترفيه: "#1FA5A3",
  سياحي: "#4E8B57",
  رياضة: "#3b82f6",
  فاجئني: "#B85C38",
};

export default function PlacesFilters({
  places,
  deleteAction,
  setStatusAction,
  setEditAllowedAction,
  approveEditRequestAction,
  rejectEditRequestAction,
  approveEditSubmissionAction,
  rejectEditSubmissionAction,
  canDelete,
}: {
  places: PlaceRow[];
  deleteAction: (id: string) => Promise<void>;
  setStatusAction?: (
    id: string,
    status: PlaceStatus,
    rejectionReason?: string,
    allowEdit?: boolean,
  ) => Promise<void>;
  /** Flip the edit_allowed flag on a place that's already rejected. */
  setEditAllowedAction?: (id: string, allowed: boolean) => Promise<void>;
  approveEditRequestAction?: (id: string, response?: string) => Promise<void>;
  rejectEditRequestAction?: (id: string, reason: string) => Promise<void>;
  approveEditSubmissionAction?: (submissionId: string) => Promise<void>;
  rejectEditSubmissionAction?: (
    submissionId: string,
    reason: string,
  ) => Promise<void>;
  canDelete?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState("الكل");
  const [selectedBudget, setSelectedBudget] = useState("الكل");
  const [minRating, setMinRating] = useState(0);
  const [source, setSource] = useState<"all" | "admin" | "provider">("all");
  const [activityOpen, setActivityOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);

  // Rejection dialog — shown when the admin clicks ❌
  const [rejectTarget, setRejectTarget] = useState<PlaceRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  /**
   * When true, the provider can edit + resubmit the rejected place. The
   * admin opts in deliberately by checking the box in the reject dialog.
   * Default false → admin must consciously open the door.
   */
  const [rejectAllowEdit, setRejectAllowEdit] = useState(false);
  const [editRequestRejectTarget, setEditRequestRejectTarget] =
    useState<PlaceRow | null>(null);
  const [editRequestRejectReason, setEditRequestRejectReason] = useState("");
  const [comparisonTarget, setComparisonTarget] = useState<PlaceRow | null>(
    null,
  );
  const [submissionRejectReason, setSubmissionRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const searchRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);
  const budgetRef = useRef<HTMLDivElement>(null);
  const ratingRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);

  // Suggestions — also surface owner business / email so the admin can find a
  // place by typing the seller's name (e.g. when chasing a complaint).
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return places
      .filter(
        (p) =>
          p.place_name.toLowerCase().includes(q) ||
          p.city_name.toLowerCase().includes(q) ||
          p.activity_name?.toLowerCase().includes(q) ||
          p.owner_business?.toLowerCase().includes(q) ||
          p.owner_email?.toLowerCase().includes(q) ||
          p.owner_name?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [searchQuery, places]);

  // Filtered
  const filtered = useMemo(() => {
    return places.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        p.place_name.toLowerCase().includes(q) ||
        p.city_name.toLowerCase().includes(q) ||
        p.activity_name?.toLowerCase().includes(q) ||
        p.owner_business?.toLowerCase().includes(q) ||
        p.owner_email?.toLowerCase().includes(q) ||
        p.owner_name?.toLowerCase().includes(q);
      const matchActivity =
        selectedActivity === "الكل" || p.activity_name === selectedActivity;
      const matchBudget =
        selectedBudget === "الكل" || p.budget === selectedBudget;
      const matchRating = p.rating >= minRating;
      const matchSource =
        source === "all" ||
        (source === "admin" && !p.provider_id) ||
        (source === "provider" && !!p.provider_id);
      return matchSearch && matchActivity && matchBudget && matchRating && matchSource;
    });
  }, [places, searchQuery, selectedActivity, selectedBudget, minRating, source]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSuggestions(false);
      if (activityRef.current && !activityRef.current.contains(e.target as Node))
        setActivityOpen(false);
      if (budgetRef.current && !budgetRef.current.contains(e.target as Node))
        setBudgetOpen(false);
      if (ratingRef.current && !ratingRef.current.contains(e.target as Node))
        setRatingOpen(false);
      if (sourceRef.current && !sourceRef.current.contains(e.target as Node))
        setSourceOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasFilters =
    searchQuery ||
    selectedActivity !== "الكل" ||
    selectedBudget !== "الكل" ||
    minRating > 0 ||
    source !== "all";

  function clearAll() {
    setSearchQuery("");
    setSelectedActivity("الكل");
    setSelectedBudget("الكل");
    setMinRating(0);
    setSource("all");
  }

  const selectedActivityOpt = ACTIVITY_OPTIONS.find((o) => o.value === selectedActivity);
  const ratingLabel = minRating === 0 ? "التقييم" : `${minRating} ★ فأكثر`;

  return (
    <>
      {/* Filter Bar */}
      <div className={s.filterBar}>
        {/* Search */}
        <div className={s.searchWrapper} ref={searchRef}>
          <Search size={16} className={s.searchIcon} />
          <input
            type="text"
            placeholder="ابحث عن مكان، صاحب نشاط، إيميل، مدينة..."
            value={searchQuery}
            className={s.searchInput}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
          />
          {searchQuery && (
            <button
              className={s.clearSearch}
              onClick={() => { setSearchQuery(""); setShowSuggestions(false); }}
            >
              <X size={14} />
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <ul className={s.suggestions}>
              {suggestions.map((p) => (
                <li
                  key={p.id}
                  className={s.suggestionItem}
                  onMouseDown={() => { setSearchQuery(p.place_name); setShowSuggestions(false); }}
                >
                  <span className={s.suggestionName}>{p.place_name}</span>
                  <span className={s.suggestionMeta}>
                    {p.owner_business
                      ? `${p.owner_business} · ${p.city_name}`
                      : `${p.city_name} · ${p.activity_name}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Activity Filter */}
        <div className={s.dropdownWrapper} ref={activityRef}>
          <button
            className={`${s.dropdownTrigger} ${selectedActivity !== "الكل" ? s.active : ""}`}
            onClick={() => { setActivityOpen((p) => !p); setBudgetOpen(false); setRatingOpen(false); }}
          >
            {selectedActivityOpt?.icon && <selectedActivityOpt.icon size={14} />}
            {selectedActivity === "الكل" ? "نوع النشاط" : selectedActivity}
            <ChevronDown size={15} className={activityOpen ? s.chevronRotated : ""} />
          </button>
          {activityOpen && (
            <ul className={s.dropdownMenu}>
              {ACTIVITY_OPTIONS.map((opt) => (
                <li
                  key={opt.value}
                  className={`${s.dropdownItem} ${selectedActivity === opt.value ? s.selected : ""}`}
                  onClick={() => { setSelectedActivity(opt.value); setActivityOpen(false); }}
                >
                  <opt.icon size={14} />
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Budget Filter */}
        <div className={s.dropdownWrapper} ref={budgetRef}>
          <button
            className={`${s.dropdownTrigger} ${selectedBudget !== "الكل" ? s.active : ""}`}
            onClick={() => { setBudgetOpen((p) => !p); setActivityOpen(false); setRatingOpen(false); }}
          >
            <Wallet size={14} /> {selectedBudget === "الكل" ? "الميزانية" : selectedBudget}
            <ChevronDown size={15} className={budgetOpen ? s.chevronRotated : ""} />
          </button>
          {budgetOpen && (
            <ul className={s.dropdownMenu}>
              {BUDGET_OPTIONS.map((opt) => (
                <li
                  key={opt.value}
                  className={`${s.dropdownItem} ${selectedBudget === opt.value ? s.selected : ""}`}
                  onClick={() => { setSelectedBudget(opt.value); setBudgetOpen(false); }}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Source filter — admin-added vs provider-added */}
        <div className={s.dropdownWrapper} ref={sourceRef}>
          <button
            className={`${s.dropdownTrigger} ${source !== "all" ? s.active : ""}`}
            onClick={() => {
              setSourceOpen((p) => !p);
              setActivityOpen(false);
              setBudgetOpen(false);
              setRatingOpen(false);
            }}
          >
            <Filter size={14} />
            {SOURCE_OPTIONS.find((o) => o.value === source)?.label}
            <ChevronDown
              size={15}
              className={sourceOpen ? s.chevronRotated : ""}
            />
          </button>
          {sourceOpen && (
            <ul className={s.dropdownMenu}>
              {SOURCE_OPTIONS.map((opt) => (
                <li
                  key={opt.value}
                  className={`${s.dropdownItem} ${source === opt.value ? s.selected : ""}`}
                  onClick={() => {
                    setSource(opt.value);
                    setSourceOpen(false);
                  }}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rating Filter */}
        <div className={s.dropdownWrapper} ref={ratingRef}>
          <button
            className={`${s.dropdownTrigger} ${minRating > 0 ? s.active : ""}`}
            onClick={() => { setRatingOpen((p) => !p); setActivityOpen(false); setBudgetOpen(false); }}
          >
            <Star size={14} />
            {ratingLabel}
            <ChevronDown size={15} className={ratingOpen ? s.chevronRotated : ""} />
          </button>
          {ratingOpen && (
            <ul className={s.dropdownMenu}>
              {RATING_OPTIONS.map((opt) => (
                <li
                  key={opt.value}
                  className={`${s.dropdownItem} ${minRating === opt.value ? s.selected : ""}`}
                  onClick={() => { setMinRating(opt.value); setRatingOpen(false); }}
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
        <span className={s.resultsCount}>{filtered.length} مكان</span>
      </div>

      {/* Table */}
      <div className={s.tableCard}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>المكان</th>
              <th>صاحب المكان</th>
              <th>المدينة</th>
              <th>النشاط</th>
              <th>التقييم</th>
              <th>الحالة</th>
              <th>التحليلات</th>
              <th>الإعلانات</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className={s.emptyState}>
                    <div className={s.emptyStateIcon}><MapPin size={26} /></div>
                    <span className={s.emptyStateTitle}>لا توجد أماكن مطابقة</span>
                    <button className={s.clearAllBtn} onClick={clearAll}>مسح الفلاتر</button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((place) => {
                const color = ACTIVITY_COLORS[place.activity_name] || "#0F5D7A";
                const addedByAdmin = !place.provider_id;
                return (
                  <tr key={place.id}>
                    <td>
                      <div className={s.infoCell}>
                        {place.image_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={place.image_path}
                            alt={place.place_name}
                            style={{
                              width: 42, height: 42,
                              borderRadius: "var(--radius-sm)",
                              objectFit: "cover",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 42, height: 42,
                              borderRadius: "var(--radius-sm)",
                              background: `${color}18`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              flexShrink: 0, color,
                            }}
                          >
                            <MapPin size={18} />
                          </div>
                        )}
                        <div className={s.infoCellBody}>
                          <span className={s.infoCellTitle}>{place.place_name}</span>
                          <span className={s.infoCellSub}>{place.budget}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <OwnerCell
                        business={place.owner_business}
                        email={place.owner_email}
                        name={place.owner_name}
                        addedByAdmin={addedByAdmin}
                      />
                    </td>
                    <td style={{ fontSize: "0.88rem" }}>{place.city_name}</td>
                    <td>
                      <span
                        className={s.badge}
                        style={{ background: `${color}18`, color }}
                      >
                        <span style={{display: 'inline-flex', verticalAlign: 'middle'}}>
                          {ACTIVITY_OPTIONS.find((a) => a.value === place.activity_name)?.icon && (() => { const Icon = ACTIVITY_OPTIONS.find((a) => a.value === place.activity_name)?.icon; return Icon ? <Icon size={12} /> : null; })()}
                        </span>{" "}
                        {place.activity_name}
                      </span>
                    </td>
                    <td>
                      <div className={s.starsRow}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            size={14}
                            fill={i <= place.rating ? "#D9A441" : "transparent"}
                            stroke={i <= place.rating ? "#D9A441" : "#D9E1E5"}
                          />
                        ))}
                        <span style={{ fontSize: "0.78rem", color: "var(--color-gray)", fontWeight: 700 }}>
                          {place.rating}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <StatusBadge status={place.status ?? "pending"} />
                        {place.edit_request_status === "pending" && (
                          <span
                            className={s.badge}
                            style={{
                              background: "rgba(37,99,235,0.10)",
                              color: "#1d4ed8",
                            }}
                          >
                            <Edit3 size={12} />
                            طلب تعديل جديد
                          </span>
                        )}
                        {place.edit_request_status === "submitted" && (
                          <>
                            <span
                              className={s.badge}
                              style={{
                                background: "rgba(217,119,6,0.10)",
                                color: "#92400e",
                              }}
                            >
                              <Hourglass size={12} />
                              تعديل تحت المراجعة خلال 6 ساعات
                            </span>
                            {place.edit_submission && (
                              <button
                                type="button"
                                className={s.secondaryBtn}
                                style={{ padding: "0.4rem 0.65rem" }}
                                onClick={() => {
                                  setComparisonTarget(place);
                                  setSubmissionRejectReason("");
                                }}
                              >
                                عرض القديم والجديد
                              </button>
                            )}
                          </>
                        )}
                        {place.status === "rejected" && setEditAllowedAction && (
                          <EditAllowedToggle
                            place={place}
                            onChange={(allowed) =>
                              setEditAllowedAction(place.id, allowed)
                            }
                          />
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem" }}>
                        <span>مشاهدات: {place.analytics_views ?? 0}</span>
                        <span>مفضلة: {place.analytics_favorites ?? 0}</span>
                        <span>خريطة: {place.analytics_map_clicks ?? 0}</span>
                        <span>تفاعلات: {place.analytics_interactions ?? 0}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem" }}>
                        <span>إجمالي: {place.campaign_count ?? 0}</span>
                        <span>قيد المراجعة: {place.pending_campaign_count ?? 0}</span>
                      </div>
                    </td>
                    <td>
                      <div className={s.actionGroup}>
                        {!addedByAdmin &&
                          place.edit_request_status === "pending" &&
                          approveEditRequestAction && (
                            <form
                              action={approveEditRequestAction.bind(
                                null,
                                place.id,
                                undefined,
                              )}
                            >
                              <button
                                type="submit"
                                className={`${s.actionBtn} ${s.actionBtnApprove}`}
                                title="قبول طلب التعديل"
                                aria-label={`قبول طلب تعديل ${place.place_name}`}
                              >
                                <Edit3 size={16} />
                              </button>
                            </form>
                          )}
                        {!addedByAdmin &&
                          place.edit_request_status === "pending" &&
                          rejectEditRequestAction && (
                            <button
                              type="button"
                              className={`${s.actionBtn} ${s.actionBtnReject}`}
                              title="رفض طلب التعديل مع السبب"
                              aria-label={`رفض طلب تعديل ${place.place_name}`}
                              onClick={() => {
                                setEditRequestRejectTarget(place);
                                setEditRequestRejectReason("");
                              }}
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                        {!addedByAdmin &&
                          setStatusAction &&
                          (place.status ?? "pending") !== "approved" && (
                          <form action={setStatusAction.bind(null, place.id, "approved", undefined, undefined)}>
                            <button
                              type="submit"
                              className={`${s.actionBtn} ${s.actionBtnApprove}`}
                              title="اعتماد"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          </form>
                        )}
                        {!addedByAdmin &&
                          setStatusAction &&
                          (place.status ?? "pending") !== "rejected" && (
                          <button
                            type="button"
                            className={`${s.actionBtn} ${s.actionBtnReject}`}
                            title="رفض مع كتابة السبب"
                            onClick={() => {
                              setRejectTarget(place);
                              setRejectReason("");
                              setRejectAllowEdit(false);
                            }}
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        {!addedByAdmin &&
                          setStatusAction &&
                          (place.status ?? "pending") !== "pending" && (
                          <form action={setStatusAction.bind(null, place.id, "pending", undefined, undefined)}>
                            <button
                              type="submit"
                              className={`${s.actionBtn} ${s.actionBtnPending}`}
                              title="إعادة للمراجعة"
                            >
                              <Hourglass size={16} />
                            </button>
                          </form>
                        )}
                        <Link
                          href={`/dashboard/places/${place.id}/edit`}
                          className={`${s.actionBtn} ${s.actionBtnEdit}`}
                          title="تعديل"
                        >
                          <Edit3 size={16} />
                        </Link>
                        {canDelete && (
                          <ConfirmDestructiveButton
                            title="حذف المكان"
                            message={`سيتم حذف "${place.place_name}" نهائيًا من النظام. هذا الإجراء لا يمكن التراجع عنه.`}
                            confirmLabel="تأكيد الحذف"
                            pendingLabel="جارٍ الحذف..."
                            formAction={deleteAction.bind(null, place.id)}
                            triggerClassName={`${s.actionBtn} ${s.actionBtnDelete}`}
                            triggerTitle="حذف"
                          >
                            <Trash2 size={16} />
                          </ConfirmDestructiveButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Rejection-reason dialog ── */}
      {rejectTarget && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => e.target === e.currentTarget && setRejectTarget(null)}
        >
          <div
            style={{
              background: "var(--color-card, #fff)",
              borderRadius: "var(--radius-xl, 16px)",
              padding: "2rem",
              width: "min(480px, 90vw)",
              display: "flex", flexDirection: "column", gap: "1.2rem",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: "rgba(220,38,38,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <XCircle size={22} color="var(--color-error)" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: "1.05rem" }}>
                  رفض المكان
                </h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-gray, #6b7280)" }}>
                  {rejectTarget.place_name}
                </p>
              </div>
              <button
                onClick={() => setRejectTarget(null)}
                style={{
                  marginRight: "auto", background: "none", border: "none",
                  cursor: "pointer", color: "var(--color-gray)", padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Reason input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontWeight: 700, fontSize: "0.88rem" }}>
                سبب الرفض <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-gray)" }}>
                سيظهر هذا السبب للمزوّد مباشرةً في تطبيق على فين؟ عبر الـ Realtime.
              </p>
              <textarea
                rows={4}
                dir="rtl"
                placeholder="مثال: الصور غير واضحة — يرجى تحديث صور المكان أو تعديل الوصف ليعكس الخدمة الفعلية."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{
                  width: "100%", resize: "vertical",
                  padding: "0.75rem 1rem",
                  border: "1.5px solid var(--color-border, #e5e7eb)",
                  borderRadius: "var(--radius-md, 10px)",
                  fontSize: "0.9rem", fontFamily: "inherit",
                  lineHeight: 1.6,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--color-primary, #0F5D7A)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--color-border, #e5e7eb)")
                }
              />
            </div>

            {/* Allow-edit checkbox */}
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.65rem",
                padding: "0.85rem 1rem",
                background: rejectAllowEdit ? "rgba(16,185,129,0.08)" : "var(--color-background, #f3f4f6)",
                border: `1.5px solid ${rejectAllowEdit ? "rgba(16,185,129,0.5)" : "var(--color-border, #e5e7eb)"}`,
                borderRadius: "var(--radius-md, 10px)",
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              <input
                type="checkbox"
                checked={rejectAllowEdit}
                onChange={(e) => setRejectAllowEdit(e.target.checked)}
                style={{
                  marginTop: "2px",
                  width: 18,
                  height: 18,
                  accentColor: "#4E8B57",
                  cursor: "pointer",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 800, fontSize: "0.88rem" }}>
                  اسمحله يعدّل ويعيد الإرسال
                </span>
                <span style={{ fontSize: "0.78rem", color: "var(--color-text-tertiary, #6b7280)" }}>
                  لو السبب بسيط (صور غير واضحة، وصف ناقص...) اسمح للمزوّد يعدّل
                  ويرجّعه للمراجعة مرة تانية بدلاً من تقديم طعن كامل.
                </span>
              </div>
            </label>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setRejectTarget(null)}
                style={{
                  flex: 1, padding: "0.75rem",
                  border: "1.5px solid var(--color-border, #e5e7eb)",
                  borderRadius: "var(--radius-md, 10px)",
                  background: "none", cursor: "pointer",
                  fontWeight: 700, fontSize: "0.9rem",
                }}
              >
                إلغاء
              </button>
              <button
                disabled={!rejectReason.trim() || isPending}
                onClick={() => {
                  if (!setStatusAction || !rejectReason.trim()) return;
                  const target = rejectTarget;
                  const reason = rejectReason.trim();
                  const allowEdit = rejectAllowEdit;
                  startTransition(async () => {
                    await setStatusAction(target.id, "rejected", reason, allowEdit);
                    setRejectTarget(null);
                    setRejectReason("");
                    setRejectAllowEdit(false);
                  });
                }}
                style={{
                  flex: 1, padding: "0.75rem",
                  background: rejectReason.trim() && !isPending ? "#B85C38" : "#D9E1E5",
                  border: "none",
                  borderRadius: "var(--radius-md, 10px)",
                  color: "#fff", cursor: rejectReason.trim() && !isPending ? "pointer" : "not-allowed",
                  fontWeight: 800, fontSize: "0.9rem",
                  transition: "background 0.2s",
                }}
              >
                {isPending ? "جارٍ الرفض…" : "تأكيد الرفض ❌"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editRequestRejectTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-edit-request-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={(event) =>
            event.target === event.currentTarget &&
            setEditRequestRejectTarget(null)
          }
        >
          <div
            style={{
              background: "var(--color-card, #fff)",
              borderRadius: "var(--radius-xl, 16px)",
              padding: "1.5rem",
              width: "min(460px, 100%)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            }}
          >
            <div>
              <h3
                id="reject-edit-request-title"
                style={{ margin: 0, fontWeight: 800, fontSize: "1.05rem" }}
              >
                رفض طلب تعديل المكان
              </h3>
              <p
                style={{
                  margin: "0.35rem 0 0",
                  color: "var(--color-gray)",
                  fontSize: "0.84rem",
                }}
              >
                {editRequestRejectTarget.place_name} سيظل ظاهرًا ببياناته الحالية.
              </p>
            </div>
            <label
              htmlFor="edit-request-rejection"
              style={{ fontWeight: 700, fontSize: "0.88rem" }}
            >
              وضّح السبب لمقدم الخدمة
            </label>
            <textarea
              id="edit-request-rejection"
              autoFocus
              rows={4}
              value={editRequestRejectReason}
              onChange={(event) => setEditRequestRejectReason(event.target.value)}
              placeholder="مثال: وضّح البيانات المطلوب تغييرها قبل إرسال طلب جديد."
              style={{
                width: "100%",
                resize: "vertical",
                padding: "0.75rem 1rem",
                border: "1.5px solid var(--color-border, #e5e7eb)",
                borderRadius: "var(--radius-md, 10px)",
                font: "inherit",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className={s.secondaryBtn}
                onClick={() => setEditRequestRejectTarget(null)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className={s.dangerBtn}
                disabled={!editRequestRejectReason.trim() || isPending}
                onClick={() => {
                  if (
                    !rejectEditRequestAction ||
                    !editRequestRejectReason.trim()
                  ) {
                    return;
                  }
                  const target = editRequestRejectTarget;
                  const reason = editRequestRejectReason.trim();
                  startTransition(async () => {
                    await rejectEditRequestAction(target.id, reason);
                    setEditRequestRejectTarget(null);
                    setEditRequestRejectReason("");
                  });
                }}
              >
                {isPending ? "جارٍ الحفظ..." : "رفض الطلب"}
              </button>
            </div>
          </div>
        </div>
      )}

      {comparisonTarget?.edit_submission && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="place-edit-comparison-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.52)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "1rem",
          }}
          onClick={(event) =>
            event.target === event.currentTarget && setComparisonTarget(null)
          }
        >
          <div
            style={{
              background: "var(--color-card, #fff)",
              borderRadius: "var(--radius-xl, 16px)",
              width: "min(920px, 100%)",
              maxHeight: "min(88vh, 820px)",
              overflowY: "auto",
              padding: "1.5rem",
              boxShadow: "0 24px 70px rgba(0,0,0,0.22)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                alignItems: "start",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3
                  id="place-edit-comparison-title"
                  style={{ margin: 0, fontSize: "1.15rem", fontWeight: 900 }}
                >
                  مقارنة تعديل {comparisonTarget.place_name}
                </h3>
                <p
                  style={{
                    margin: "0.4rem 0 0",
                    color: "var(--color-gray)",
                  }}
                >
                  المكان ما زال ظاهرًا بالنسخة القديمة. الموافقة وحدها تنشر
                  التعديل الجديد.
                </p>
              </div>
              <button
                type="button"
                className={s.actionBtn}
                onClick={() => setComparisonTarget(null)}
                aria-label="إغلاق المقارنة"
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {EDIT_COMPARISON_FIELDS.map((field) => {
                const submission = comparisonTarget.edit_submission!;
                const oldValue = displayEditValue(
                  submission.previous_data[field.key],
                );
                const newValue = displayEditValue(
                  submission.proposed_data[field.key],
                );
                const changed = oldValue !== newValue;
                return (
                  <div
                    key={field.key}
                    style={{
                      border: `1px solid ${
                        changed ? "rgba(217,119,6,0.42)" : "var(--color-border)"
                      }`,
                      borderRadius: "12px",
                      padding: "0.9rem",
                      background: changed
                        ? "rgba(217,119,6,0.05)"
                        : "var(--color-surface, #fafafa)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        marginBottom: "0.65rem",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                      }}
                    >
                      <span>{field.label}</span>
                      {changed && (
                        <span style={{ color: "#92400e", fontSize: "0.75rem" }}>
                          اتغيّر
                        </span>
                      )}
                    </div>
                    <ComparisonValue
                      label="الحالي"
                      value={oldValue}
                      isImage={field.key === "image_path"}
                    />
                    <ComparisonValue
                      label="المقترح"
                      value={newValue}
                      isImage={field.key === "image_path"}
                    />
                  </div>
                );
              })}
            </div>

            {comparisonTarget.edit_submission.provider_note && (
              <p
                style={{
                  margin: "1rem 0 0",
                  padding: "0.75rem",
                  borderRadius: "10px",
                  background: "var(--color-surface, #fafafa)",
                }}
              >
                <strong>ملاحظة مقدم الخدمة:</strong>{" "}
                {comparisonTarget.edit_submission.provider_note}
              </p>
            )}

            <label
              htmlFor="submission-rejection-reason"
              style={{
                display: "block",
                marginTop: "1rem",
                fontWeight: 800,
              }}
            >
              سبب الرفض، عند الحاجة
            </label>
            <textarea
              id="submission-rejection-reason"
              rows={3}
              value={submissionRejectReason}
              onChange={(event) =>
                setSubmissionRejectReason(event.target.value)
              }
              placeholder="اكتب سببًا واضحًا يظهر لمقدم الخدمة ويمكنه الطعن عليه."
              style={{
                width: "100%",
                marginTop: "0.5rem",
                resize: "vertical",
                padding: "0.75rem 1rem",
                border: "1.5px solid var(--color-border, #e5e7eb)",
                borderRadius: "10px",
                font: "inherit",
                boxSizing: "border-box",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                flexWrap: "wrap",
                marginTop: "1rem",
              }}
            >
              <button
                type="button"
                className={s.primaryBtn}
                disabled={isPending || !approveEditSubmissionAction}
                onClick={() => {
                  const submissionId =
                    comparisonTarget.edit_submission?.id;
                  if (!submissionId || !approveEditSubmissionAction) return;
                  startTransition(async () => {
                    await approveEditSubmissionAction(submissionId);
                    setComparisonTarget(null);
                  });
                }}
              >
                <CheckCircle2 size={17} />
                {isPending ? "جارٍ الحفظ..." : "قبول ونشر التعديل"}
              </button>
              <button
                type="button"
                className={s.dangerBtn}
                disabled={
                  isPending ||
                  !rejectEditSubmissionAction ||
                  !submissionRejectReason.trim()
                }
                onClick={() => {
                  const submissionId =
                    comparisonTarget.edit_submission?.id;
                  const reason = submissionRejectReason.trim();
                  if (
                    !submissionId ||
                    !reason ||
                    !rejectEditSubmissionAction
                  ) {
                    return;
                  }
                  startTransition(async () => {
                    await rejectEditSubmissionAction(submissionId, reason);
                    setComparisonTarget(null);
                    setSubmissionRejectReason("");
                  });
                }}
              >
                <XCircle size={17} />
                رفض التعديل
              </button>
              <button
                type="button"
                className={s.secondaryBtn}
                onClick={() => setComparisonTarget(null)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const EDIT_COMPARISON_FIELDS = [
  { key: "place_name", label: "اسم المكان" },
  { key: "activity_name", label: "نوع النشاط" },
  { key: "budget", label: "الميزانية" },
  { key: "price_range", label: "نطاق السعر" },
  { key: "place_address", label: "العنوان" },
  { key: "city_name", label: "المدينة" },
  { key: "description", label: "الوصف" },
  { key: "image_path", label: "صورة الغلاف" },
] as const;

function displayEditValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function ComparisonValue({
  label,
  value,
  isImage = false,
}: {
  label: string;
  value: string;
  isImage?: boolean;
}) {
  const imageUrl = isImage ? resolvePlaceImageUrl(value) : null;
  return (
    <div style={{ marginTop: "0.45rem" }}>
      <div
        style={{
          color: "var(--color-gray)",
          fontSize: "0.75rem",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      {imageUrl ? (
        // Admin comparison needs the exact before/after asset, not optimized
        // catalogue rendering. A plain img also supports public Storage URLs.
        <Image
          src={imageUrl}
          alt={`${label} لصورة المكان`}
          width={640}
          height={360}
          unoptimized
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            objectFit: "contain",
            marginTop: "0.35rem",
            borderRadius: "8px",
            background: "#f3f4f6",
          }}
        />
      ) : (
        <div
          dir={
            value.startsWith("http") || value.includes("://") ? "ltr" : "rtl"
          }
          style={{
            marginTop: "0.2rem",
            lineHeight: 1.55,
            overflowWrap: "anywhere",
            textAlign: "start",
          }}
        >
          {value}
        </div>
      )}
    </div>
  );
}

function resolvePlaceImageUrl(value: string): string | null {
  if (value === "—") return null;
  if (/^https?:\/\//.test(value)) return value;
  const prefix = "place-images://";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!supabaseUrl || !value.startsWith(prefix)) return null;
  const path = value
    .slice(prefix.length)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${supabaseUrl}/storage/v1/object/public/place-images/${path}`;
}

// ---------------------------------------------------------------------------
// Status badge — single source of moderation truth surfaced in the table.
// The same colour scheme is used by the Flutter "under review" card so the
// admin and the provider see the same state in the same shade.
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; fg: string; icon: typeof Hourglass }> = {
    pending: {
      label: "قيد المراجعة",
      bg: "rgba(217,119,6,0.12)",
      fg: "#7A5400",
      icon: Hourglass,
    },
    under_review: {
      label: "تحت المراجعة",
      bg: "rgba(59,130,246,0.12)",
      fg: "#0F5D7A",
      icon: Hourglass,
    },
    approved: {
      label: "معتمد",
      bg: "rgba(16,185,129,0.12)",
      fg: "#4E8B57",
      icon: CheckCircle2,
    },
    rejected: {
      label: "مرفوض",
      bg: "rgba(220,38,38,0.12)",
      fg: "#B85C38",
      icon: XCircle,
    },
    suspended: {
      label: "معلّق",
      bg: "rgba(75,85,99,0.12)",
      fg: "#4b5563",
      icon: XCircle,
    },
  };
  // Fallback for any unknown status so the page never crashes
  const cfg = map[status] ?? {
    label: status,
    bg: "rgba(107,114,128,0.10)",
    fg: "#6b7280",
    icon: Hourglass,
  };
  const Icon = cfg.icon;
  return (
    <span
      className={s.badge}
      style={{ background: cfg.bg, color: cfg.fg, display: "inline-flex", alignItems: "center", gap: 4 }}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Owner cell — surfaces who actually listed the place. The primary line is
// the business name (what the admin recognises), the secondary line is the
// owner's email so a quick reach-out is one copy away. If neither is set
// (e.g. a legacy place imported before the providers table existed) we show
// a soft "—" so the row doesn't look broken.
// ---------------------------------------------------------------------------
function OwnerCell({
  business,
  email,
  name,
  addedByAdmin,
}: {
  business?: string | null;
  email?: string | null;
  name?: string | null;
  /** True when the place has no provider_id (added directly from dashboard). */
  addedByAdmin?: boolean;
}) {
  // Admin-added rows have no provider — render a clean "trust" badge instead
  // of an empty cell so the admin instantly knows this row didn't need
  // review and didn't come from a mobile signup.
  if (addedByAdmin) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "0.32rem 0.65rem",
          borderRadius: "var(--radius-sm)",
          background: "rgba(15,93,122,0.12)",
          color: "#0F5D7A",
          fontSize: "0.78rem",
          fontWeight: 700,
        }}
      >
        <ShieldCheck size={13} />
        أُضيف بواسطة الأدمن
      </span>
    );
  }
  if (!business && !email && !name) {
    return <span style={{ color: "var(--color-gray-light)" }}>—</span>;
  }
  const primary = business ?? name ?? email ?? "—";
  const secondary = email && primary !== email ? email : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.55rem",
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "var(--radius-sm)",
          background: "rgba(31,165,163,0.10)",
          color: "#0F5D7A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Store size={15} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          gap: 2,
        }}
      >
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "var(--color-text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 200,
          }}
        >
          {primary}
        </span>
        {secondary && (
          <span
            dir="ltr"
            style={{
              fontSize: "0.74rem",
              color: "var(--color-gray)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 200,
            }}
          >
            <Mail size={11} />
            {secondary}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditAllowedToggle — inline pill on rejected rows that lets the admin open
// or close the "edit & resubmit" door without going through the reject
// dialog again. Hidden for any non-rejected status because the flag is
// meaningless outside of rejection.
// ---------------------------------------------------------------------------
function EditAllowedToggle({
  place,
  onChange,
}: {
  place: PlaceRow;
  onChange: (allowed: boolean) => Promise<void>;
}) {
  const [allowed, setAllowed] = useState(!!place.edit_allowed);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !allowed;
    setAllowed(next); // optimistic
    setBusy(true);
    try {
      await onChange(next);
    } catch {
      // Revert on failure
      setAllowed(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={
        allowed
          ? "السماح بالتعديل مفتوح — اضغط للإغلاق"
          : "اضغط للسماح للمزوّد بالتعديل وإعادة الإرسال"
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "0.25rem 0.55rem",
        background: allowed
          ? "rgba(16,185,129,0.12)"
          : "var(--color-background, #f3f4f6)",
        color: allowed ? "#4E8B57" : "var(--color-text-tertiary)",
        border: `1px solid ${allowed ? "rgba(16,185,129,0.3)" : "var(--color-border, #e5e7eb)"}`,
        borderRadius: 999,
        cursor: busy ? "wait" : "pointer",
        fontSize: "0.7rem",
        fontWeight: 700,
        width: "fit-content",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      <Edit3 size={10} />
      {allowed ? "تعديل مفتوح" : "تعديل مغلق"}
    </button>
  );
}
