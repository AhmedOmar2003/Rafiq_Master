"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, ChevronDown, Star, Trash2, MapPin } from "lucide-react";
import s from "../shared.module.css";
import ls from "./reviews.module.css";

type ReviewRow = {
  review_id: number;
  review_text: string;
  created_at: string;
  rating: number;
  name: string;
  places?: { place_name?: string } | null;
};

const RATING_OPTIONS = [
  { label: "الكل", value: 0 },
  { label: "1 نجمة", value: 1 },
  { label: "2 نجمة", value: 2 },
  { label: "3 نجوم", value: 3 },
  { label: "4 نجوم", value: 4 },
  { label: "5 نجوم", value: 5 },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className={s.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          fill={i <= rating ? "#f59e0b" : "transparent"}
          stroke={i <= rating ? "#f59e0b" : "#d1d5db"}
        />
      ))}
      <span className={ls.ratingNum}>{rating}</span>
    </div>
  );
}

export default function ReviewsFilters({
  reviews,
  deleteAction,
}: {
  reviews: ReviewRow[];
  deleteAction: (id: number) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [placeFilter, setPlaceFilter] = useState("الكل");
  const [ratingOpen, setRatingOpen] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const ratingRef = useRef<HTMLDivElement>(null);
  const placeRef = useRef<HTMLDivElement>(null);

  // Unique place list
  const placeOptions = useMemo(() => {
    const names = reviews
      .map((r) => r.places?.place_name)
      .filter((n): n is string => !!n);
    return ["الكل", ...Array.from(new Set(names))];
  }, [reviews]);

  // Suggestions
  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return reviews
      .filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.places?.place_name?.toLowerCase().includes(q) ||
          r.review_text?.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [search, reviews]);

  // Filtered
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return reviews.filter((r) => {
      const matchSearch =
        !q ||
        r.name?.toLowerCase().includes(q) ||
        r.places?.place_name?.toLowerCase().includes(q) ||
        r.review_text?.toLowerCase().includes(q);
      const matchRating = ratingFilter === 0 || r.rating === ratingFilter;
      const matchPlace =
        placeFilter === "الكل" || r.places?.place_name === placeFilter;
      return matchSearch && matchRating && matchPlace;
    });
  }, [reviews, search, ratingFilter, placeFilter]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSuggestions(false);
      if (ratingRef.current && !ratingRef.current.contains(e.target as Node))
        setRatingOpen(false);
      if (placeRef.current && !placeRef.current.contains(e.target as Node))
        setPlaceOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const hasFilters = search || ratingFilter > 0 || placeFilter !== "الكل";

  function clearAll() {
    setSearch("");
    setRatingFilter(0);
    setPlaceFilter("الكل");
  }

  const ratingLabel =
    ratingFilter === 0 ? "التقييم" : `${ratingFilter} ★`;

  return (
    <>
      {/* Filter Bar */}
      <div className={s.filterBar}>
        {/* Search */}
        <div className={s.searchWrapper} ref={searchRef}>
          <Search size={16} className={s.searchIcon} />
          <input
            type="text"
            placeholder="ابحث في التقييمات..."
            value={search}
            className={s.searchInput}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
          />
          {search && (
            <button
              className={s.clearSearch}
              onClick={() => { setSearch(""); setShowSuggestions(false); }}
            >
              <X size={14} />
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <ul className={s.suggestions}>
              {suggestions.map((r) => (
                <li
                  key={r.review_id}
                  className={s.suggestionItem}
                  onMouseDown={() => {
                    setSearch(r.places?.place_name || r.name || "");
                    setShowSuggestions(false);
                  }}
                >
                  <span className={s.suggestionName}>
                    {r.places?.place_name || "مكان محذوف"}
                  </span>
                  <span className={s.suggestionMeta}>{r.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rating Dropdown */}
        <div className={s.dropdownWrapper} ref={ratingRef}>
          <button
            className={`${s.dropdownTrigger} ${ratingFilter > 0 ? s.active : ""}`}
            onClick={() => { setRatingOpen((p) => !p); setPlaceOpen(false); }}
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
                  className={`${s.dropdownItem} ${ratingFilter === opt.value ? s.selected : ""}`}
                  onClick={() => { setRatingFilter(opt.value); setRatingOpen(false); }}
                >
                  {opt.value > 0 && (
                    <Stars rating={opt.value} />
                  )}
                  {opt.value === 0 && opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Place Dropdown */}
        <div className={s.dropdownWrapper} ref={placeRef}>
          <button
            className={`${s.dropdownTrigger} ${placeFilter !== "الكل" ? s.active : ""}`}
            onClick={() => { setPlaceOpen((p) => !p); setRatingOpen(false); }}
          >
            <MapPin size={14} /> {placeFilter === "الكل" ? "المكان" : placeFilter}
            <ChevronDown size={15} className={placeOpen ? s.chevronRotated : ""} />
          </button>
          {placeOpen && (
            <ul className={s.dropdownMenu}>
              {placeOptions.map((opt) => (
                <li
                  key={opt}
                  className={`${s.dropdownItem} ${placeFilter === opt ? s.selected : ""}`}
                  onClick={() => { setPlaceFilter(opt); setPlaceOpen(false); }}
                >
                  {opt}
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
        <span className={s.resultsCount}>{filtered.length} تقييم</span>
      </div>

      {/* Table */}
      <div className={s.tableCard}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>المكان</th>
              <th>المستخدم</th>
              <th>التقييم</th>
              <th>التعليق</th>
              <th>التاريخ</th>
              <th>حذف</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={s.emptyState}>
                    <div className={s.emptyStateIcon}><Star size={26} /></div>
                    <span className={s.emptyStateTitle}>لا توجد تقييمات مطابقة</span>
                    <button className={s.clearAllBtn} onClick={clearAll}>مسح الفلاتر</button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((review) => (
                <tr key={review.review_id}>
                  <td>
                    <span className={ls.placeName}>
                      {review.places?.place_name || (
                        <span className={ls.deleted}>مكان محذوف</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <div className={s.infoCell}>
                      <div
                        className={s.avatar}
                        style={{ background: "var(--color-primary-alpha)", color: "var(--color-primary)" }}
                      >
                        {(review.name || "؟").slice(0, 1)}
                      </div>
                      <span className={ls.userName}>{review.name || "—"}</span>
                    </div>
                  </td>
                  <td><Stars rating={review.rating} /></td>
                  <td>
                    <span className={ls.reviewText} title={review.review_text}>
                      {review.review_text}
                    </span>
                  </td>
                  <td dir="ltr" className={ls.dateCell}>
                    {new Date(review.created_at).toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td>
                    <form action={deleteAction.bind(null, review.review_id)}>
                      <button
                        type="submit"
                        className={`${s.actionBtn} ${s.actionBtnDelete}`}
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </form>
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
