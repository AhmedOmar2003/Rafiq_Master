"use client";

import { useState, useMemo, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { Edit3, Trash2, Search, X, ChevronDown, Star, MapPin, Utensils, PartyPopper, Building2, Activity, Dices, Wallet, CheckCircle2, XCircle, Hourglass, Store, Mail, ShieldCheck, Filter } from "lucide-react";
import s from "../shared.module.css";

type PlaceStatus = "pending" | "under_review" | "approved" | "rejected" | "suspended";

type PlaceRow = {
  place_id: number;
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
  طعام: "#f59e0b",
  ترفيه: "#8b5cf6",
  سياحي: "#10b981",
  رياضة: "#3b82f6",
  فاجئني: "#ec4899",
};

export default function PlacesFilters({
  places,
  deleteAction,
  setStatusAction,
  setEditAllowedAction,
}: {
  places: PlaceRow[];
  deleteAction: (id: number) => Promise<void>;
  setStatusAction?: (
    id: number,
    status: PlaceStatus,
    rejectionReason?: string,
    allowEdit?: boolean,
  ) => Promise<void>;
  /** Flip the edit_allowed flag on a place that's already rejected. */
  setEditAllowedAction?: (id: number, allowed: boolean) => Promise<void>;
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
                  key={p.place_id}
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
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className={s.emptyState}>
                    <div className={s.emptyStateIcon}><MapPin size={26} /></div>
                    <span className={s.emptyStateTitle}>لا توجد أماكن مطابقة</span>
                    <button className={s.clearAllBtn} onClick={clearAll}>مسح الفلاتر</button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((place) => {
                const color = ACTIVITY_COLORS[place.activity_name] || "#681F00";
                return (
                  <tr key={place.place_id}>
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
                        addedByAdmin={!place.provider_id}
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
                            fill={i <= place.rating ? "#f59e0b" : "transparent"}
                            stroke={i <= place.rating ? "#f59e0b" : "#d1d5db"}
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
                        {place.status === "rejected" && setEditAllowedAction && (
                          <EditAllowedToggle
                            place={place}
                            onChange={(allowed) =>
                              setEditAllowedAction(place.place_id, allowed)
                            }
                          />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={s.actionGroup}>
                        {setStatusAction && (place.status ?? "pending") !== "approved" && (
                          <form action={setStatusAction.bind(null, place.place_id, "approved", undefined, undefined)}>
                            <button
                              type="submit"
                              className={`${s.actionBtn}`}
                              style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}
                              title="اعتماد"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          </form>
                        )}
                        {setStatusAction && (place.status ?? "pending") !== "rejected" && (
                          <button
                            type="button"
                            className={`${s.actionBtn}`}
                            style={{ background: "rgba(220,38,38,0.12)", color: "#dc2626" }}
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
                        {setStatusAction && (place.status ?? "pending") !== "pending" && (
                          <form action={setStatusAction.bind(null, place.place_id, "pending", undefined, undefined)}>
                            <button
                              type="submit"
                              className={`${s.actionBtn}`}
                              style={{ background: "rgba(217,119,6,0.12)", color: "#d97706" }}
                              title="إعادة للمراجعة"
                            >
                              <Hourglass size={16} />
                            </button>
                          </form>
                        )}
                        <Link
                          href={`/dashboard/places/${place.place_id}/edit`}
                          className={`${s.actionBtn} ${s.actionBtnEdit}`}
                          title="تعديل"
                        >
                          <Edit3 size={16} />
                        </Link>
                        <form action={deleteAction.bind(null, place.place_id)}>
                          <button
                            type="submit"
                            className={`${s.actionBtn} ${s.actionBtnDelete}`}
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </form>
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
                <XCircle size={22} color="#dc2626" />
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
                سبب الرفض <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-gray)" }}>
                سيظهر هذا السبب للمزوّد مباشرةً في تطبيق رفيق عبر الـ Realtime.
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
                  (e.target.style.borderColor = "var(--color-primary, #681F00)")
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
                  accentColor: "#10b981",
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
                    await setStatusAction(target.place_id, "rejected", reason, allowEdit);
                    setRejectTarget(null);
                    setRejectReason("");
                    setRejectAllowEdit(false);
                  });
                }}
                style={{
                  flex: 1, padding: "0.75rem",
                  background: rejectReason.trim() && !isPending ? "#dc2626" : "#fca5a5",
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
    </>
  );
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
      fg: "#d97706",
      icon: Hourglass,
    },
    under_review: {
      label: "تحت المراجعة",
      bg: "rgba(59,130,246,0.12)",
      fg: "#2563eb",
      icon: Hourglass,
    },
    approved: {
      label: "معتمد",
      bg: "rgba(16,185,129,0.12)",
      fg: "#10b981",
      icon: CheckCircle2,
    },
    rejected: {
      label: "مرفوض",
      bg: "rgba(220,38,38,0.12)",
      fg: "#dc2626",
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
          background: "rgba(104,31,0,0.10)",
          color: "#681F00",
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
          background: "rgba(104,31,0,0.08)",
          color: "#681F00",
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
        color: allowed ? "#10b981" : "var(--color-text-tertiary, #6b7280)",
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
