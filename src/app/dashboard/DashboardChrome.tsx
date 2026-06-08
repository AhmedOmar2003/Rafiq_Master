"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, MapPin, Star, Settings, LogOut, Activity,
  Bell, Menu, X, ChevronLeft, Store, CreditCard, Gavel, ShieldAlert,
  Megaphone,
} from "lucide-react";
import styles from "./layout.module.css";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  desc: string;
  /** Only super_admin sees this entry. Regular admins get a filtered nav. */
  superAdminOnly?: boolean;
};

const allNavItems: NavItem[] = [
  { name: "نظرة عامة",      href: "/dashboard",               icon: LayoutDashboard, desc: "الإحصائيات" },
  { name: "النشاط",          href: "/dashboard/activity",      icon: Activity,        desc: "كل اللي بيحصل" },
  { name: "المستخدمون",     href: "/dashboard/users",         icon: Users,           desc: "إدارة الحسابات", superAdminOnly: true },
  { name: "مقدّمو الخدمة",  href: "/dashboard/providers",     icon: Store,           desc: "أصحاب الأنشطة" },
  { name: "الاشتراكات",     href: "/dashboard/subscriptions", icon: CreditCard,      desc: "خطط الباقات والإيراد", superAdminOnly: true },
  { name: "الأماكن",        href: "/dashboard/places",        icon: MapPin,          desc: "إدارة الأماكن" },
  { name: "الإعلانات",      href: "/dashboard/campaigns",     icon: Megaphone,       desc: "مراجعة العروض والحملات" },
  { name: "الطعون",         href: "/dashboard/appeals",       icon: Gavel,           desc: "اعتراضات مقدّمي الخدمة" },
  { name: "البلاغات",        href: "/dashboard/reports",       icon: ShieldAlert,     desc: "بلاغات المستخدمين" },
  { name: "التقييمات",      href: "/dashboard/reviews",       icon: Star,            desc: "المراجعات" },
  { name: "الإعدادات",      href: "/dashboard/settings",      icon: Settings,        desc: "إعدادات التطبيق", superAdminOnly: true },
];

type Props = {
  children: React.ReactNode;
  role: "admin" | "super_admin" | null;
  displayName: string;
};

export default function DashboardChrome({ children, role, displayName }: Props) {
  // Filter the nav based on the server-resolved role so regular admins
  // never see super-admin entries even briefly. Page guards (`requireSuperAdmin`)
  // are the server-side belt around this client-side suspenders.
  const navItems = allNavItems.filter(
    (i) => !i.superAdminOnly || role === "super_admin",
  );
  const roleLabel = role === "super_admin" ? "Super Admin" : "Admin";
  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || "A";
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const logoutButtonRef = useRef<HTMLButtonElement>(null);
  const logoutDialogRef = useRef<HTMLDivElement>(null);

  const closeLogoutModal = () => {
    setShowLogoutModal(false);
    setLogoutError("");
    window.requestAnimationFrame(() => logoutButtonRef.current?.focus());
  };

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1024px)");
    const syncSidebar = () => setIsSidebarOpen(!media.matches);
    syncSidebar();
    media.addEventListener("change", syncSidebar);
    return () => media.removeEventListener("change", syncSidebar);
  }, []);

  useEffect(() => {
    if (!showLogoutModal) return;
    const handleDialogKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoggingOut) {
        closeLogoutModal();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = logoutDialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex='-1'])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleDialogKeyboard);
    return () => document.removeEventListener("keydown", handleDialogKeyboard);
  }, [showLogoutModal, isLoggingOut]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLogoutError("معرفناش نسجّل خروجك دلوقتي. جرّب تاني.");
      setIsLoggingOut(false);
      return;
    }
    window.location.assign("/login");
  };

  // Breadcrumb
  const currentPage = navItems.find((i) => i.href === pathname);

  return (
    <div className={styles.dashboardLayout}>
      {/* Skip link — lets keyboard users jump straight to page content */}
      <a href="#main-content" className={styles.skipLink}>
        تخطى للمحتوى الرئيسي
      </a>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <button
          type="button"
          className={styles.mobileOverlay}
          onClick={() => setIsSidebarOpen(false)}
          aria-label="إغلاق القائمة الجانبية"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : styles.sidebarClosed} ${isCollapsed ? styles.sidebarCollapsed : ""}`}
        aria-label="التنقل الرئيسي"
      >
        {/* Logo */}
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.logo}>
            <div className={styles.logoIcon}>
              <MapPin size={18} />
            </div>
            {!isCollapsed && (
              <div className={styles.logoTextGroup}>
                <span className={styles.logoText}>رفيق</span>
                <span className={styles.logoSub}>لوحة التحكم</span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={styles.collapseBtn}
            aria-label={isCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
            title={isCollapsed ? "توسيع" : "طي"}
          >
            <ChevronLeft
              size={15}
              style={{
                transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.3s ease",
              }}
            />
          </button>
        </div>

        {/* Nav */}
        <nav className={styles.nav} aria-label="أقسام لوحة التحكم">
          {!isCollapsed && (
            <span className={styles.navGroupLabel}>القائمة الرئيسية</span>
          )}
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                aria-current={isActive ? "page" : undefined}
                title={isCollapsed ? item.name : undefined}
                onClick={() => {
                  if (window.matchMedia("(max-width: 1024px)").matches) {
                    setIsSidebarOpen(false);
                  }
                }}
              >
                <div className={styles.navItemIcon}>
                  <item.icon size={19} />
                </div>
                {!isCollapsed && (
                  <div className={styles.navItemBody}>
                    <span className={styles.navItemName}>{item.name}</span>
                    <span className={styles.navItemDesc}>{item.desc}</span>
                  </div>
                )}
                {isActive && !isCollapsed && <div className={styles.navActiveIndicator} />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          {!isCollapsed && (
            <div className={styles.sidebarProfile}>
              <div className={styles.sidebarAvatar}>{avatarLetter}</div>
              <div className={styles.sidebarProfileInfo}>
                <span className={styles.sidebarProfileName}>{displayName}</span>
                <span className={styles.sidebarProfileRole}>{roleLabel}</span>
              </div>
            </div>
          )}
          <button
            ref={logoutButtonRef}
            onClick={() => setShowLogoutModal(true)}
            className={styles.logoutButton}
            title={isCollapsed ? "تسجيل الخروج" : undefined}
          >
            <LogOut size={17} />
            {!isCollapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className={styles.mainContent}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`${styles.iconBtn} ${styles.menuBtn}`}
              aria-label={isSidebarOpen ? "إغلاق القائمة" : "فتح القائمة"}
              aria-expanded={isSidebarOpen}
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Breadcrumb */}
            {currentPage && (
              <div className={styles.breadcrumb}>
                <span className={styles.breadcrumbRoot}>رفيق</span>
                <ChevronLeft size={14} className={styles.breadcrumbSep} />
                <span className={styles.breadcrumbCurrent}>
                  <currentPage.icon size={15} style={{ display: "inline-block", verticalAlign: "middle", marginBottom: "2px" }} /> {currentPage.name}
                </span>
              </div>
            )}

          </div>

          <div className={styles.topbarRight}>
            <Link
              href="/dashboard/activity"
              className={`${styles.iconBtn} ${styles.bellBtn}`}
              aria-label="افتح سجل النشاط"
              title="سجل النشاط"
            >
              <Bell size={19} aria-hidden="true" />
            </Link>

            <div className={styles.topbarDivider} />

            <div className={styles.profileChip} aria-label={`${displayName}، ${roleLabel}`}>
              <div className={styles.profileAvatar}>{avatarLetter}</div>
              <div className={styles.profileInfo}>
                <span className={styles.profileName}>{displayName}</span>
                <span className={styles.profileRole}>{roleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className={styles.pageContainer} tabIndex={-1}>
          {children}
        </main>
      </div>

      {/* ── Logout Modal ── */}
      {showLogoutModal && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !isLoggingOut) {
              closeLogoutModal();
            }
          }}
        >
          <div
            className={styles.modalContent}
            ref={logoutDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalIconWrap}>
                <LogOut size={26} strokeWidth={2.5} />
              </div>
              <h3 id="logout-dialog-title" className={styles.modalTitle}>تسجيل الخروج</h3>
            </div>
            <p className={styles.modalBody}>
              هل أنت متأكد أنك تريد تسجيل الخروج من لوحة تحكم رفيق؟
            </p>
            {logoutError && (
              <p className={styles.modalError} role="alert" aria-live="assertive">
                {logoutError}
              </p>
            )}
            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  closeLogoutModal();
                }}
                className={styles.modalCancelBtn}
                disabled={isLoggingOut}
                autoFocus
              >
                إلغاء
              </button>
              <button
                onClick={handleLogout}
                className={styles.modalConfirmBtn}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "جارٍ تسجيل الخروج..." : "تأكيد الخروج"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
