"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, ChevronDown, Users, Shield, User } from "lucide-react";
import { format } from "date-fns";
import s from "../shared.module.css";
import ls from "./users.module.css";

type UserRow = {
  id: string;
  email?: string;
  created_at: string;
  user_metadata?: { full_name?: string; name?: string };
  role?: "admin" | "super_admin" | null;
};

const ROLE_OPTIONS = [
  { label: "الكل", value: "all" },
  { label: "مستخدم", value: "user" },
  { label: "مشرف", value: "admin" },
  { label: "مشرف أعلى", value: "super_admin" },
];

const AVATAR_COLORS = [
  "#681F00", "#8b5cf6", "#10b981", "#f59e0b", "#3b82f6",
  "#ec4899", "#6366f1", "#14b8a6",
];

export default function UsersFilters({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState("");
  const [showSugg, setShowSugg] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [roleOpen, setRoleOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSugg(false);
      if (roleRef.current && !roleRef.current.contains(e.target as Node))
        setRoleOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function getName(u: UserRow) {
    return (
      u.user_metadata?.full_name ||
      u.user_metadata?.name ||
      u.email?.split("@")[0] ||
      "بدون اسم"
    );
  }

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return users
      .filter(
        (u) =>
          getName(u).toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [search, users]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        getName(u).toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q);
      const matchRole =
        roleFilter === "all" ||
        (roleFilter === "user" && !u.role) ||
        u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const hasFilters = search || roleFilter !== "all";

  function clearAll() {
    setSearch("");
    setRoleFilter("all");
  }

  function getRoleInfo(role?: string | null) {
    if (role === "super_admin")
      return { label: "مشرف أعلى", cls: `${s.badge} ${s.badgePrimary}` };
    if (role === "admin")
      return { label: "مشرف", cls: `${s.badge} ${s.badgeGold}` };
    return { label: "مستخدم", cls: `${s.badge} ${s.badgeGray}` };
  }

  const roleLabel =
    ROLE_OPTIONS.find((o) => o.value === roleFilter)?.label || "الدور";

  return (
    <>
      {/* Filter Bar */}
      <div className={s.filterBar}>
        <div className={s.searchWrapper} ref={searchRef}>
          <Search size={16} className={s.searchIcon} />
          <input
            type="text"
            placeholder="ابحث بالاسم أو البريد..."
            value={search}
            className={s.searchInput}
            onChange={(e) => { setSearch(e.target.value); setShowSugg(true); }}
            onFocus={() => setShowSugg(true)}
          />
          {search && (
            <button className={s.clearSearch} onClick={() => { setSearch(""); setShowSugg(false); }}>
              <X size={14} />
            </button>
          )}
          {showSugg && suggestions.length > 0 && (
            <ul className={s.suggestions}>
              {suggestions.map((u) => (
                <li
                  key={u.id}
                  className={s.suggestionItem}
                  onMouseDown={() => { setSearch(getName(u)); setShowSugg(false); }}
                >
                  <span className={s.suggestionName}>{getName(u)}</span>
                  <span className={s.suggestionMeta}>{u.email}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Role Filter */}
        <div className={s.dropdownWrapper} ref={roleRef}>
          <button
            className={`${s.dropdownTrigger} ${roleFilter !== "all" ? s.active : ""}`}
            onClick={() => setRoleOpen((p) => !p)}
          >
            <Shield size={14} />
            {roleLabel}
            <ChevronDown size={15} className={roleOpen ? s.chevronRotated : ""} />
          </button>
          {roleOpen && (
            <ul className={s.dropdownMenu}>
              {ROLE_OPTIONS.map((opt) => (
                <li
                  key={opt.value}
                  className={`${s.dropdownItem} ${roleFilter === opt.value ? s.selected : ""}`}
                  onClick={() => { setRoleFilter(opt.value); setRoleOpen(false); }}
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
        <span className={s.resultsCount}>{filtered.length} مستخدم</span>
      </div>

      {/* Table */}
      <div className={s.tableCard}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>المستخدم</th>
              <th>البريد الإلكتروني</th>
              <th>تاريخ التسجيل</th>
              <th>الدور</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className={s.emptyState}>
                    <div className={s.emptyStateIcon}><Users size={26} /></div>
                    <span className={s.emptyStateTitle}>لا يوجد مستخدمون مطابقون</span>
                    <button className={s.clearAllBtn} onClick={clearAll}>مسح الفلاتر</button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((user, i) => {
                const name = getName(user);
                const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const roleInfo = getRoleInfo(user.role);
                return (
                  <tr key={user.id}>
                    <td>
                      <div className={s.infoCell}>
                        <div
                          className={s.avatar}
                          style={{ background: `${color}20`, color }}
                        >
                          {String(name).slice(0, 1).toUpperCase()}
                        </div>
                        <div className={s.infoCellBody}>
                          <span className={s.infoCellTitle}>{name}</span>
                          <span className={s.infoCellSub}>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td dir="ltr" className={ls.emailCell}>{user.email || "—"}</td>
                    <td dir="ltr" className={ls.dateCell}>
                      {format(new Date(user.created_at), "dd/MM/yyyy")}
                    </td>
                    <td>
                      <span className={roleInfo.cls}>
                        {roleInfo.label === "مشرف أعلى" && <Shield size={11} />}
                        {roleInfo.label === "مشرف" && <Shield size={11} />}
                        {roleInfo.label === "مستخدم" && <User size={11} />}
                        {roleInfo.label}
                      </span>
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
