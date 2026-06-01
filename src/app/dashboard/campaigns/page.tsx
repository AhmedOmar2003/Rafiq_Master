import { Megaphone, CheckCircle2, Clock3, MousePointerClick } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import s from "../shared.module.css";
import { approveCampaign, rejectCampaign } from "./actions";

export const metadata = { title: "إدارة الإعلانات - رفيق" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CampaignRow = {
  id: string;
  provider_id: string;
  place_id: string | null;
  kind: string;
  status: string;
  title: string;
  body: string | null;
  image_path: string | null;
  cta_label: string | null;
  starts_at: string;
  ends_at: string;
  impressions: number;
  clicks: number;
  rejection_reason: string | null;
  created_at: string;
};

type PlaceRow = {
  id: string;
  place_name: string | null;
  provider_id: string | null;
};

type ProviderRow = {
  id: string;
  business_name: string | null;
  contact_email: string | null;
};

function kindLabel(kind: string) {
  switch (kind) {
    case "featured":
      return "ظهور مميز";
    case "spotlight":
      return "سبوت لايت";
    case "push_notification":
      return "إشعار";
    case "discount":
      return "خصم";
    default:
      return "حملة";
  }
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    active: { label: "نشط", bg: "rgba(16,185,129,0.12)", fg: "#10b981" },
    pending_review: { label: "قيد المراجعة", bg: "rgba(217,119,6,0.12)", fg: "#d97706" },
    rejected: { label: "مرفوض", bg: "rgba(220,38,38,0.12)", fg: "#dc2626" },
    paused: { label: "موقوف", bg: "rgba(75,85,99,0.12)", fg: "#4b5563" },
    ended: { label: "منتهي", bg: "rgba(75,85,99,0.12)", fg: "#4b5563" },
    draft: { label: "مسودة", bg: "rgba(59,130,246,0.12)", fg: "#2563eb" },
  };
  const cfg = map[status] ?? map.draft;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "0.3rem 0.65rem",
        borderRadius: 999,
        background: cfg.bg,
        color: cfg.fg,
        fontSize: "0.78rem",
        fontWeight: 800,
      }}
    >
      {cfg.label}
    </span>
  );
}

export default async function CampaignsPage() {
  const supabase = createAdminClient();
  const [{ data: campaigns }, { data: places }, { data: providers }] =
    await Promise.all([
      supabase
        .from("promotional_campaigns")
        .select(
          "id,provider_id,place_id,kind,status,title,body,image_path,cta_label,starts_at,ends_at,impressions,clicks,rejection_reason,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(250),
      supabase.from("places").select("id,place_name,provider_id"),
      supabase.from("providers").select("id,business_name,contact_email"),
    ]);

  const placeById = new Map<string, PlaceRow>();
  for (const place of (places ?? []) as PlaceRow[]) {
    placeById.set(place.id, place);
  }

  const providerById = new Map<string, ProviderRow>();
  for (const provider of (providers ?? []) as ProviderRow[]) {
    providerById.set(provider.id, provider);
  }

  const rows = ((campaigns ?? []) as CampaignRow[]).map((campaign) => {
    const place = campaign.place_id ? placeById.get(campaign.place_id) : undefined;
    const provider = providerById.get(campaign.provider_id);
    return {
      ...campaign,
      placeName: place?.place_name ?? "مكان غير معروف",
      providerName: provider?.business_name ?? "مقدم خدمة",
      providerEmail: provider?.contact_email ?? "—",
    };
  });

  const pendingCount = rows.filter((row) => row.status === "pending_review").length;
  const activeCount = rows.filter((row) => row.status === "active").length;

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <div className={s.pageBreadcrumb}>
            لوحة التحكم <span>/</span> الإعلانات
          </div>
          <h1 className={s.pageTitle}>مراجعة الإعلانات والعروض</h1>
          <p className={s.pageSubtitle}>
            كل حملة مربوطة بمكان محدد، وتظهر للمستخدمين فقط بعد الموافقة.
          </p>
        </div>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: "rgba(104,31,0,0.10)", color: "#681F00" }}>
            <Megaphone size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{rows.length}</div>
            <div className={s.statLabel}>إجمالي الحملات</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: "rgba(217,119,6,0.12)", color: "#d97706" }}>
            <Clock3 size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{pendingCount}</div>
            <div className={s.statLabel}>قيد المراجعة</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
            <CheckCircle2 size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{activeCount}</div>
            <div className={s.statLabel}>نشطة</div>
          </div>
        </div>
      </div>

      <div className={s.tableCard}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>الإعلان</th>
              <th>المكان</th>
              <th>مقدم الخدمة</th>
              <th>النوع</th>
              <th>الحالة</th>
              <th>الأداء</th>
              <th>المراجعة</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className={s.emptyState}>
                    <div className={s.emptyStateIcon}><Megaphone size={26} /></div>
                    <span className={s.emptyStateTitle}>لا توجد حملات بعد</span>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const reviewDeadline = new Date(
                  new Date(row.created_at).getTime() + 6 * 60 * 60 * 1000,
                );
                const isPending = row.status === "pending_review";
                return (
                  <tr key={row.id}>
                    <td>
                      <div className={s.infoCell}>
                        {row.image_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.image_path}
                            alt={row.title}
                            style={{
                              width: 46,
                              height: 46,
                              borderRadius: "var(--radius-sm)",
                              objectFit: "cover",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 46,
                              height: 46,
                              borderRadius: "var(--radius-sm)",
                              background: "rgba(104,31,0,0.08)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#681F00",
                              flexShrink: 0,
                            }}
                          >
                            <Megaphone size={18} />
                          </div>
                        )}
                        <div className={s.infoCellBody}>
                          <span className={s.infoCellTitle}>{row.title}</span>
                          <span className={s.infoCellSub}>
                            {row.body?.trim() || "بدون وصف إضافي"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <strong>{row.placeName}</strong>
                        <span style={{ color: "var(--color-gray)" }}>
                          {row.cta_label?.trim() || "CTA افتراضي"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <strong>{row.providerName}</strong>
                        <span dir="ltr" style={{ color: "var(--color-gray)" }}>
                          {row.providerEmail}
                        </span>
                      </div>
                    </td>
                    <td>{kindLabel(row.kind)}</td>
                    <td>{statusBadge(row.status)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Megaphone size={14} /> {row.impressions}
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <MousePointerClick size={14} /> {row.clicks}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 260 }}>
                        <span style={{ color: "var(--color-gray)" }}>
                          {isPending
                            ? `الموعد المستهدف: ${reviewDeadline.toLocaleString("ar-EG")}`
                            : row.rejection_reason?.trim()
                              ? `سبب الرفض: ${row.rejection_reason}`
                              : "تمت المراجعة"}
                        </span>
                        {isPending && (
                          <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
                            <form action={approveCampaign.bind(null, row.id)}>
                              <button className={s.primaryBtn} type="submit">
                                اعتماد الإعلان
                              </button>
                            </form>
                            <form action={rejectCampaign}>
                              <input type="hidden" name="id" value={row.id} />
                              <textarea
                                name="reason"
                                rows={2}
                                placeholder="اكتب سبب الرفض الذي سيظهر لمقدم الخدمة"
                                style={{
                                  width: "100%",
                                  marginBottom: 8,
                                  padding: "0.75rem",
                                  borderRadius: "10px",
                                  border: "1px solid var(--color-border, #e5e7eb)",
                                  fontFamily: "inherit",
                                }}
                              />
                              <button
                                type="submit"
                                style={{
                                  background: "rgba(220,38,38,0.12)",
                                  color: "#dc2626",
                                  border: "none",
                                  borderRadius: 10,
                                  padding: "0.7rem 1rem",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                }}
                              >
                                رفض الإعلان
                              </button>
                            </form>
                          </div>
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
    </div>
  );
}
