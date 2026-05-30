"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, MapPin, Star, Settings, LogOut, Activity,
  Bell, Search, Menu, X, ChevronLeft, Store, CreditCard, Gavel, ShieldAlert,
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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Breadcrumb
  const currentPage = navItems.find((i) => i.href === pathname);

  return (
    <div className={styles.dashboardLayout}>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className={styles.mobileOverlay} onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : styles.sidebarClosed} ${isCollapsed ? styles.sidebarCollapsed : ""}`}
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
        <nav className={styles.nav}>
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
                title={isCollapsed ? item.name : undefined}
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
      <main className={styles.mainContent}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`${styles.iconBtn} ${styles.menuBtn}`}
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

            <div className={styles.searchContainer}>
              <Search className={styles.searchIcon} size={15} />
              <input
                type="text"
                placeholder="ابحث في الداشبورد..."
                className={styles.searchInput}
              />
            </div>
          </div>

          <div className={styles.topbarRight}>
            <button className={`${styles.iconBtn} ${styles.bellBtn}`}>
              <Bell size={19} />
              <span className={styles.badge}>3</span>
            </button>

            <div className={styles.topbarDivider} />

            <div className={styles.profileChip}>
              <div className={styles.profileAvatar}>{avatarLetter}</div>
              <div className={styles.profileInfo}>
                <span className={styles.profileName}>{displayName}</span>
                <span className={styles.profileRole}>{roleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className={styles.pageContainer}>{children}</div>
      </main>

      {/* ── Logout Modal ── */}
      {showLogoutModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconWrap}>
                <LogOut size={26} strokeWidth={2.5} />
              </div>
              <h3 className={styles.modalTitle}>تسجيل الخروج</h3>
            </div>
            <p className={styles.modalBody}>
              هل أنت متأكد أنك تريد تسجيل الخروج من لوحة تحكم رفيق؟
            </p>
            <div className={styles.modalActions}>
              <button 
                onClick={() => setShowLogoutModal(false)}
                className={styles.modalCancelBtn}
              >
                إلغاء
              </button>
              <button 
                onClick={handleLogout}
                className={styles.modalConfirmBtn}
              >
                تأكيد الخروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
