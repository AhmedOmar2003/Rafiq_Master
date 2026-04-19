import { createAdminClient } from "@/lib/supabase/admin";
import {
  Settings, User, Database, Bell, Shield, Info,
  MapPin, Star, Users,
} from "lucide-react";
import s from "../shared.module.css";
import ls from "./page.module.css";

export const metadata = { title: "الإعدادات - رفيق" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const supabase = createAdminClient();

  const [
    { count: placesCount },
    { count: reviewsCount },
    { data: authUsers },
  ] = await Promise.all([
    supabase.from("places").select("*", { count: "exact", head: true }),
    supabase.from("reviews").select("*", { count: "exact", head: true }),
    supabase.auth.admin.listUsers(),
  ]);

  const usersCount = authUsers?.users.length ?? 0;

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <div className={s.pageBreadcrumb}>
            لوحة التحكم <span>/</span> الإعدادات
          </div>
          <h1 className={s.pageTitle}>الإعدادات</h1>
          <p className={s.pageSubtitle}>إدارة إعدادات التطبيق والحساب</p>
        </div>
      </div>

      <div className={ls.grid}>

        {/* ── App Info ── */}
        <section className={ls.card}>
          <div className={ls.cardHeader}>
            <div className={ls.cardIcon} style={{ background: "rgba(104,31,0,0.1)", color: "#681F00" }}>
              <Info size={20} />
            </div>
            <div>
              <h2 className={ls.cardTitle}>معلومات التطبيق</h2>
              <p className={ls.cardSub}>بيانات إصدار رفيق وقاعدة البيانات</p>
            </div>
          </div>
          <div className={ls.infoGrid}>
            <div className={ls.infoRow}>
              <span className={ls.infoLabel}>اسم التطبيق</span>
              <span className={ls.infoVal}>رفيق — Rafiq App</span>
            </div>
            <div className={ls.infoRow}>
              <span className={ls.infoLabel}>إصدار لوحة التحكم</span>
              <span className={ls.infoVal}>
                <span className={`${s.badge} ${s.badgeSuccess}`}>v1.0.0</span>
              </span>
            </div>
            <div className={ls.infoRow}>
              <span className={ls.infoLabel}>قاعدة البيانات</span>
              <span className={ls.infoVal}>Supabase PostgreSQL</span>
            </div>
            <div className={ls.infoRow}>
              <span className={ls.infoLabel}>البنية</span>
              <span className={ls.infoVal}>Next.js 16 · TypeScript</span>
            </div>
          </div>
        </section>

        {/* ── Database Stats ── */}
        <section className={ls.card}>
          <div className={ls.cardHeader}>
            <div className={ls.cardIcon} style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
              <Database size={20} />
            </div>
            <div>
              <h2 className={ls.cardTitle}>إحصائيات قاعدة البيانات</h2>
              <p className={ls.cardSub}>نظرة سريعة على حجم البيانات</p>
            </div>
          </div>
          <div className={ls.dbStats}>
            <div className={ls.dbStatItem}>
              <div className={ls.dbStatIcon} style={{ background: "rgba(104,31,0,0.08)" }}>
                <MapPin size={18} style={{ color: "#681F00" }} />
              </div>
              <div>
                <div className={ls.dbStatVal}>{placesCount ?? 0}</div>
                <div className={ls.dbStatLabel}>مكان مدرج</div>
              </div>
            </div>
            <div className={ls.dbStatItem}>
              <div className={ls.dbStatIcon} style={{ background: "rgba(245,158,11,0.08)" }}>
                <Star size={18} style={{ color: "#d97706" }} />
              </div>
              <div>
                <div className={ls.dbStatVal}>{reviewsCount ?? 0}</div>
                <div className={ls.dbStatLabel}>تقييم مسجل</div>
              </div>
            </div>
            <div className={ls.dbStatItem}>
              <div className={ls.dbStatIcon} style={{ background: "rgba(99,102,241,0.08)" }}>
                <Users size={18} style={{ color: "#6366f1" }} />
              </div>
              <div>
                <div className={ls.dbStatVal}>{usersCount}</div>
                <div className={ls.dbStatLabel}>مستخدم مسجل</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Admin Profile ── */}
        <section className={ls.card}>
          <div className={ls.cardHeader}>
            <div className={ls.cardIcon} style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
              <User size={20} />
            </div>
            <div>
              <h2 className={ls.cardTitle}>ملف المشرف</h2>
              <p className={ls.cardSub}>بيانات حساب الإدارة الحالي</p>
            </div>
          </div>
          <div className={ls.profileSection}>
            <div className={ls.profileAvatar}>أ</div>
            <div>
              <div className={ls.profileName}>أحمد عمر ماهر</div>
              <div className={ls.profileRole}>
                <Shield size={12} /> Super Admin
              </div>
            </div>
          </div>
          <div className={ls.infoGrid} style={{ marginTop: "1rem" }}>
            <div className={ls.infoRow}>
              <span className={ls.infoLabel}>البريد الإلكتروني</span>
              <span className={ls.infoVal} dir="ltr">admin@rafiq.app</span>
            </div>
            <div className={ls.infoRow}>
              <span className={ls.infoLabel}>الصلاحية</span>
              <span className={ls.infoVal}>
                <span className={`${s.badge} ${s.badgePrimary}`}>
                  <Shield size={10} /> مشرف أعلى
                </span>
              </span>
            </div>
          </div>
        </section>

        {/* ── Permissions ── */}
        <section className={ls.card}>
          <div className={ls.cardHeader}>
            <div className={ls.cardIcon} style={{ background: "rgba(104,31,0,0.1)", color: "#681F00" }}>
              <Shield size={20} />
            </div>
            <div>
              <h2 className={ls.cardTitle}>صلاحيات الإدارة</h2>
              <p className={ls.cardSub}>ما يستطيع المشرف الأعلى فعله</p>
            </div>
          </div>
          <div className={ls.permList}>
            {[
              "إضافة وتعديل وحذف الأماكن",
              "حذف تقييمات المستخدمين",
              "عرض جميع حسابات المستخدمين",
              "الوصول إلى إحصائيات التطبيق",
              "إدارة أدوار المشرفين",
            ].map((perm) => (
              <div key={perm} className={ls.permItem}>
                <span className={ls.permCheck}>✓</span>
                <span>{perm}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Notifications ── */}
        <section className={`${ls.card} ${ls.cardFull}`}>
          <div className={ls.cardHeader}>
            <div className={ls.cardIcon} style={{ background: "rgba(245,158,11,0.1)", color: "#d97706" }}>
              <Bell size={20} />
            </div>
            <div>
              <h2 className={ls.cardTitle}>إعدادات الإشعارات</h2>
              <p className={ls.cardSub}>تحكم في الإشعارات الإدارية (قريباً)</p>
            </div>
          </div>
          <div className={ls.notifGrid}>
            {[
              { label: "إشعار عند إضافة مكان جديد", enabled: true },
              { label: "إشعار عند تقييم جديد", enabled: true },
              { label: "إشعار عند تسجيل مستخدم جديد", enabled: false },
              { label: "تقارير أسبوعية", enabled: false },
            ].map((item) => (
              <div key={item.label} className={ls.notifRow}>
                <span className={ls.notifLabel}>{item.label}</span>
                <div className={`${ls.toggle} ${item.enabled ? ls.toggleOn : ""}`}>
                  <div className={ls.toggleThumb} />
                </div>
              </div>
            ))}
          </div>
          <p className={ls.comingSoon}>
            🚧 هذه الميزة قيد التطوير وستكون متاحة قريباً
          </p>
        </section>

        {/* ── About ── */}
        <section className={`${ls.card} ${ls.cardFull}`}>
          <div className={ls.aboutBanner}>
            <div className={ls.aboutLogo}>
              <MapPin size={28} />
            </div>
            <div>
              <h3 className={ls.aboutTitle}>رفيق — Rafiq</h3>
              <p className={ls.aboutSub}>
                تطبيق مصري لاكتشاف أفضل الأماكن في مدن مصر بناءً على ميزانيتك وتفضيلاتك.
                يدعم ٥ أنواع من الأنشطة: طعام، ترفيه، سياحي، رياضة، فاجئني.
              </p>
              <div className={ls.aboutTags}>
                {["Flutter", "Supabase", "Next.js", "PostgreSQL"].map((t) => (
                  <span key={t} className={`${s.badge} ${s.badgeGray}`}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
