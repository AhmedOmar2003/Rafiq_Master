import { createAdminClient } from "@/lib/supabase/admin";
import {
  User, Database, Bell, Shield, Info,
  MapPin, Star, Users, Save, Clock3, Mail, AppWindow,
} from "lucide-react";
import s from "../shared.module.css";
import ls from "./page.module.css";
import { requireSuperAdmin } from "@/lib/auth/role";
import { createClient as createSsrClient } from "@/lib/supabase/server";
import {
  updateModerationSla,
  updateNotificationPreferences,
  updateSupportProfile,
} from "./actions";

export const metadata = { title: "الإعدادات - على فين؟" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SettingRow = {
  key: string;
  value: Record<string, unknown> | null;
  updated_at: string;
};

function boolValue(data: Record<string, unknown> | null | undefined, key: string, fallback: boolean) {
  const value = data?.[key];
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(data: Record<string, unknown> | null | undefined, key: string, fallback: number) {
  const value = data?.[key];
  return typeof value === "number" ? value : fallback;
}

function stringValue(data: Record<string, unknown> | null | undefined, key: string, fallback: string) {
  const value = data?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export default async function SettingsPage() {
  // Platform settings + admin profile = super-admin surface only.
  await requireSuperAdmin();
  const supabase = createAdminClient();
  const sessionClient = await createSsrClient();

  const [
    { count: placesCount },
    { count: reviewsCount },
    { count: profilesCount },
    { data: settingsRows },
    { data: currentUserData },
  ] = await Promise.all([
    supabase.from("places").select("*", { count: "exact", head: true }),
    supabase.from("reviews").select("*", { count: "exact", head: true }),
    // head-only count is O(1)-ish and avoids pulling every row just to
    // show a number on the settings card.
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("platform_settings")
      .select("key,value,updated_at")
      .in("key", ["notification_preferences", "moderation_sla", "support_profile"]),
    sessionClient.auth.getUser(),
  ]);

  const usersCount = profilesCount ?? 0;
  const settingsMap = new Map<string, SettingRow>();
  for (const row of (settingsRows ?? []) as SettingRow[]) {
    settingsMap.set(row.key, row);
  }

  const notificationPrefs = settingsMap.get("notification_preferences")?.value ?? null;
  const moderationSla = settingsMap.get("moderation_sla")?.value ?? null;
  const supportProfile = settingsMap.get("support_profile")?.value ?? null;
  const currentUser = currentUserData.user;
  const adminName =
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    currentUser?.email?.split("@")[0] ||
    "مشرف المنصة";
  const adminEmail = currentUser?.email ?? "—";
  const profileLetter = adminName.trim().charAt(0).toUpperCase() || "أ";
  const dashboardVersion =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const latestSettingsUpdate = [
    settingsMap.get("notification_preferences")?.updated_at,
    settingsMap.get("moderation_sla")?.updated_at,
    settingsMap.get("support_profile")?.updated_at,
  ]
    .filter(Boolean)
    .sort()
    .reverse()[0];

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <div className={s.pageBreadcrumb}>
            لوحة التحكم <span>/</span> الإعدادات
          </div>
          <h1 className={s.pageTitle}>الإعدادات</h1>
          <p className={s.pageSubtitle}>إدارة إعدادات التطبيق والحساب من الباك إند مباشرة، مع حفظ فوري في قاعدة البيانات.</p>
        </div>
      </div>

      <div className={ls.grid}>

        {/* ── App Info ── */}
        <section className={ls.card}>
          <div className={ls.cardHeader}>
            <div className={`${ls.cardIcon} ${ls.cardIconPrimary}`}>
              <Info size={20} />
            </div>
            <div>
              <h2 className={ls.cardTitle}>معلومات التطبيق</h2>
              <p className={ls.cardSub}>بيانات إصدار على فين؟ وقاعدة البيانات</p>
            </div>
          </div>
          <div className={ls.infoGrid}>
            <div className={ls.infoRow}>
              <span className={ls.infoLabel}>اسم التطبيق</span>
              <span className={ls.infoVal}>
                {stringValue(supportProfile, "app_name_ar", "على فين؟")} — {stringValue(supportProfile, "app_name_en", "Ala Fein?")}
              </span>
            </div>
            <div className={ls.infoRow}>
              <span className={ls.infoLabel}>إصدار لوحة التحكم</span>
              <span className={ls.infoVal}>
                <span className={`${s.badge} ${s.badgeSuccess}`}>build {dashboardVersion}</span>
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
            <div className={ls.infoRow}>
              <span className={ls.infoLabel}>آخر تحديث للإعدادات</span>
              <span className={ls.infoVal}>
                {latestSettingsUpdate
                  ? new Date(latestSettingsUpdate).toLocaleString("ar-EG")
                  : "لم يتم التحديث بعد"}
              </span>
            </div>
          </div>
        </section>

        {/* ── Database Stats ── */}
        <section className={ls.card}>
          <div className={ls.cardHeader}>
            <div className={`${ls.cardIcon} ${ls.cardIconSuccess}`}>
              <Database size={20} />
            </div>
            <div>
              <h2 className={ls.cardTitle}>إحصائيات قاعدة البيانات</h2>
              <p className={ls.cardSub}>نظرة سريعة على حجم البيانات</p>
            </div>
          </div>
          <div className={ls.dbStats}>
            <div className={ls.dbStatItem}>
              <div className={`${ls.dbStatIcon} ${ls.dbStatIconPrimary}`}>
                <MapPin size={18} />
              </div>
              <div>
                <div className={ls.dbStatVal}>{placesCount ?? 0}</div>
                <div className={ls.dbStatLabel}>مكان مدرج</div>
              </div>
            </div>
            <div className={ls.dbStatItem}>
              <div className={`${ls.dbStatIcon} ${ls.dbStatIconWarning}`}>
                <Star size={18} />
              </div>
              <div>
                <div className={ls.dbStatVal}>{reviewsCount ?? 0}</div>
                <div className={ls.dbStatLabel}>تقييم مسجل</div>
              </div>
            </div>
            <div className={ls.dbStatItem}>
              <div className={`${ls.dbStatIcon} ${ls.dbStatIconIndigo}`}>
                <Users size={18} />
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
            <div className={`${ls.cardIcon} ${ls.cardIconIndigo}`}>
              <User size={20} />
            </div>
            <div>
              <h2 className={ls.cardTitle}>ملف المشرف</h2>
              <p className={ls.cardSub}>بيانات حساب الإدارة الحالي</p>
            </div>
          </div>
          <div className={ls.profileSection}>
            <div className={ls.profileAvatar}>{profileLetter}</div>
            <div>
              <div className={ls.profileName}>{adminName}</div>
              <div className={ls.profileRole}>
                <Shield size={12} /> Super Admin
              </div>
            </div>
          </div>
          <div className={ls.infoGrid} style={{ marginTop: "1rem" }}>
            <div className={ls.infoRow}>
              <span className={ls.infoLabel}>البريد الإلكتروني</span>
              <span className={ls.infoVal} dir="ltr">{adminEmail}</span>
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

        {/* ── Backend-backed Moderation Controls ── */}
        <section className={ls.card}>
          <div className={ls.cardHeader}>
            <div className={`${ls.cardIcon} ${ls.cardIconInfo}`}>
              <Clock3 size={20} />
            </div>
            <div>
              <h2 className={ls.cardTitle}>أزمنة المراجعة</h2>
              <p className={ls.cardSub}>إعدادات تشغيلية محفوظة في قاعدة البيانات وتستخدمها الإدارة كمرجع رسمي.</p>
            </div>
          </div>
          <form action={updateModerationSla} className={ls.formStack}>
            <div className={ls.fieldGrid}>
              <label className={ls.fieldBlock}>
                <span className={ls.fieldLabel}>مراجعة الأماكن (بالساعات)</span>
                <input
                  className={ls.input}
                  type="number"
                  min={1}
                  max={168}
                  name="place_review_hours"
                  defaultValue={numberValue(moderationSla, "place_review_hours", 24)}
                />
              </label>
              <label className={ls.fieldBlock}>
                <span className={ls.fieldLabel}>مراجعة الإعلانات (بالساعات)</span>
                <input
                  className={ls.input}
                  type="number"
                  min={1}
                  max={168}
                  name="campaign_review_hours"
                  defaultValue={numberValue(moderationSla, "campaign_review_hours", 6)}
                />
              </label>
            </div>
            <button type="submit" className={ls.saveBtn}>
              <Save size={15} />
              حفظ أزمنة المراجعة
            </button>
          </form>
        </section>

        {/* ── Notifications ── */}
        <section className={`${ls.card} ${ls.cardFull}`}>
          <div className={ls.cardHeader}>
            <div className={`${ls.cardIcon} ${ls.cardIconWarning}`}>
              <Bell size={20} />
            </div>
            <div>
              <h2 className={ls.cardTitle}>إعدادات الإشعارات</h2>
              <p className={ls.cardSub}>هذه التفضيلات محفوظة في الباك إند ويمكن تعديلها من هنا مباشرة.</p>
            </div>
          </div>
          <form action={updateNotificationPreferences} className={ls.formStack}>
            <div className={ls.notifGrid}>
              {[
                { key: "new_place", label: "إشعار عند إضافة مكان جديد" },
                { key: "new_review", label: "إشعار عند تقييم جديد" },
                { key: "new_signup", label: "إشعار عند تسجيل مستخدم جديد" },
                { key: "weekly_reports", label: "تقرير أسبوعي ملخص" },
              ].map((item) => {
                const enabled = boolValue(notificationPrefs, item.key, item.key !== "new_signup" && item.key !== "weekly_reports" ? true : false);
                return (
                  <label key={item.key} className={ls.notifRowInteractive}>
                    <span className={ls.notifLabel}>{item.label}</span>
                    <span className={ls.toggleWrap}>
                      <input
                        type="checkbox"
                        name={item.key}
                        defaultChecked={enabled}
                        className={ls.toggleInput}
                      />
                      <span className={`${ls.toggle} ${enabled ? ls.toggleOn : ""}`}>
                        <span className={ls.toggleThumb} />
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <button type="submit" className={ls.saveBtn}>
              <Save size={15} />
              حفظ إعدادات الإشعارات
            </button>
          </form>
        </section>

        {/* ── Support / Branding ── */}
        <section className={`${ls.card} ${ls.cardFull}`}>
          <div className={ls.cardHeader}>
            <div className={`${ls.cardIcon} ${ls.cardIconIndigo}`}>
              <AppWindow size={20} />
            </div>
            <div>
              <h2 className={ls.cardTitle}>هوية التطبيق والدعم</h2>
              <p className={ls.cardSub}>إعدادات تُحفظ في قاعدة البيانات وتستخدمها الإدارة كنقطة مرجعية مركزية.</p>
            </div>
          </div>
          <form action={updateSupportProfile} className={ls.formStack}>
            <div className={ls.fieldGrid}>
              <label className={ls.fieldBlock}>
                <span className={ls.fieldLabel}>اسم التطبيق بالعربية</span>
                <input
                  className={ls.input}
                  name="app_name_ar"
                  defaultValue={stringValue(supportProfile, "app_name_ar", "على فين؟")}
                />
              </label>
              <label className={ls.fieldBlock}>
                <span className={ls.fieldLabel}>اسم التطبيق بالإنجليزية</span>
                <input
                  className={ls.input}
                  name="app_name_en"
                  defaultValue={stringValue(supportProfile, "app_name_en", "Ala Fein?")}
                />
              </label>
            </div>
            <label className={ls.fieldBlock}>
              <span className={ls.fieldLabel}><Mail size={14} /> بريد الدعم</span>
              <input
                className={ls.input}
                type="email"
                name="support_email"
                dir="ltr"
                defaultValue={stringValue(supportProfile, "support_email", "admin@rafiq.app")}
              />
            </label>
            <button type="submit" className={ls.saveBtn}>
              <Save size={15} />
              حفظ بيانات الدعم
            </button>
          </form>
        </section>

        {/* ── Permissions ── */}
        <section className={`${ls.card} ${ls.cardFull}`}>
          <div className={ls.aboutBanner}>
            <div className={ls.aboutLogo}>
              <Shield size={28} />
            </div>
            <div>
              <h3 className={ls.aboutTitle}>صلاحيات المشرف الأعلى</h3>
              <p className={ls.aboutSub}>
                هذه المساحة الآن مرتبطة بالنظام الفعلي: إعدادات الإشعارات، أزمنة المراجعة، وبيانات الدعم تُحفظ في الباك إند، والمشرف الأعلى فقط يقدر يعدّلها.
              </p>
              <div className={ls.permList} style={{ marginTop: "0.85rem" }}>
                {[
                  "إدارة إعدادات المنصة وتفضيلات الإشعارات",
                  "إدارة المستخدمين وصلاحيات المشرفين",
                  "الوصول الكامل للتقارير والاشتراكات",
                  "التحكم في أزمنة المراجعة المرجعية",
                  "تتبّع النشاط الإداري من لوحة التحكم",
                ].map((perm) => (
                  <div key={perm} className={ls.permItem}>
                    <span className={ls.permCheck}>✓</span>
                    <span>{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
