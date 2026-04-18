"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { Edit3, Trash2, Search, X, ChevronDown, Star, MapPin, Utensils, PartyPopper, Building2, Activity, Dices, Wallet } from "lucide-react";
import s from "../shared.module.css";

type PlaceRow = {
  place_id: number;
  place_name: string;
  city_name: string;
  activity_name: string;
  rating: number;
  budget: string;
  image_path: string | null;
};

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
}: {
  places: PlaceRow[];
  deleteAction: (id: number) => Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState("الكل");
  const [selectedBudget, setSelectedBudget] = useState("الكل");
  const [minRating, setMinRating] = useState(0);
  const [activityOpen, setActivityOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);
  const budgetRef = useRef<HTMLDivElement>(null);
  const ratingRef = useRef<HTMLDivElement>(null);

  // Suggestions
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return places
      .filter(
        (p) =>
          p.place_name.toLowerCase().includes(q) ||
          p.city_name.toLowerCase().includes(q) ||
          p.activity_name?.toLowerCase().includes(q)
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
        p.activity_name?.toLowerCase().includes(q);
      const matchActivity =
        selectedActivity === "الكل" || p.activity_name === selectedActivity;
      const matchBudget =
        selectedBudget === "الكل" || p.budget === selectedBudget;
      const matchRating = p.rating >= minRating;
      return matchSearch && matchActivity && matchBudget && matchRating;
    });
  }, [places, searchQuery, selectedActivity, selectedBudget, minRating]);

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
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasFilters =
    searchQuery || selectedActivity !== "الكل" || selectedBudget !== "الكل" || minRating > 0;

  function clearAll() {
    setSearchQuery("");
    setSelectedActivity("الكل");
    setSelectedBudget("الكل");
    setMinRating(0);
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
            placeholder="ابحث عن مكان، مدينة، نشاط..."
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
                    {p.city_name} · {p.activity_name}
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
              <th>المدينة</th>
              <th>النشاط</th>
              <th>التقييم</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
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
                      <div className={s.actionGroup}>
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
    </>
  );
}
