import { Megaphone, CheckCircle2, Clock3, MousePointerClick } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/ui";
import s from "../shared.module.css";
import {
  approveCampaign,
  approveCampaignEditRequest,
  rejectCampaign,
  rejectCampaignEditRequest,
} from "./actions";

export const metadata = { title: "إدارة الإعلانات - على فين؟" };

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
  edit_request_status: string | null;
  edit_request_note: string | null;
  edit_request_response: string | null;
  edit_request_requested_at: string | null;
  edit_request_reviewed_at: string | null;
  edit_allowed: boolean | null;
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
    case "featured":       return "ظهور مميز";
    case "spotlight":      return "سبوت لايت";
    case "push_notification": return "إشعار";
    case "discount":       return "خصم";
    default:               return "حملة";
  }
}

export default async function CampaignsPage() {
  const supabase = createAdminClient();
  const [{ data: campaigns }, { data: places }, { data: providers }] =
    await Promise.all([
      supabase
        .from("promotional_campaigns")
        .select(
          "id,provider_id,place_id,kind,status,title,body,image_path,cta_label,starts_at,ends_at,impressions,clicks,rejection_reason,created_at,edit_request_status,edit_request_note,edit_request_response,edit_request_requested_at,edit_request_reviewed_at,edit_allowed",
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
  const pendingEditRequests = rows.filter((row) => row.edit_request_status === "pending").length;

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
          <div className={`${s.statIcon} ${s.statIconPrimary}`}>
            <Megaphone size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{rows.length}</div>
            <div className={s.statLabel}>إجمالي الحملات</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={`${s.statIcon} ${s.statIconWarning}`}>
            <Clock3 size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{pendingCount}</div>
            <div className={s.statLabel}>قيد المراجعة</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={`${s.statIcon} ${s.statIconSuccess}`}>
            <CheckCircle2 size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{activeCount}</div>
            <div className={s.statLabel}>نشطة</div>
          </div>
        </div>
        <div className={s.statCard}>
          <div className={`${s.statIcon} ${s.statIconInfo}`}>
            <Clock3 size={22} />
          </div>
          <div className={s.statBody}>
            <div className={s.statValue}>{pendingEditRequests}</div>
            <div className={s.statLabel}>طلبات تعديل</div>
          </div>
        </div>
      </div>

      <div className={s.tableCard}>
        <div className={s.tableWrapper}>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">الإعلان</th>
              <th scope="col">المكان</th>
              <th scope="col">مقدم الخدمة</th>
              <th scope="col">النوع</th>
              <th scope="col">الحالة</th>
              <th scope="col">الأداء</th>
              <th scope="col">المراجعة</th>
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
                const hasPendingEditRequest = row.edit_request_status === "pending";
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
                              width: 46, height: 46,
                              borderRadius: "var(--radius-sm)",
                              objectFit: "cover", flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div className={`${s.statIcon} ${s.statIconPrimary}`} style={{ flexShrink: 0 }}>
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
                    <td><StatusBadge status={row.status} /></td>
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
                          {hasPendingEditRequest
                            ? `طلب تعديل منذ ${new Date(row.edit_request_requested_at ?? row.created_at).toLocaleString("ar-EG")}`
                            : isPending
                            ? `الموعد المستهدف: ${reviewDeadline.toLocaleString("ar-EG")}`
                            : row.edit_request_status === "approved"
                              ? `تم فتح التعديل للمزوّد${row.edit_request_reviewed_at ? ` • ${new Date(row.edit_request_reviewed_at).toLocaleString("ar-EG")}` : ""}`
                              : row.edit_request_status === "rejected" && row.edit_request_response?.trim()
                                ? `رد الإدارة على طلب التعديل: ${row.edit_request_response}`
                            : row.rejection_reason?.trim()
                              ? `سبب الرفض: ${row.rejection_reason}`
                              : "تمت المراجعة"}
                        </span>
                        {row.edit_request_note?.trim() && (
                          <div className={s.noteBox}>
                            <strong>ملاحظة المزوّد:</strong> {row.edit_request_note}
                          </div>
                        )}
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
                                className={s.reviewTextarea}
                              />
                              <button type="submit" className={s.dangerBtn}>
                                رفض الإعلان
                              </button>
                            </form>
                          </div>
                        )}
                        {hasPendingEditRequest && (
                          <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
                            <form action={approveCampaignEditRequest}>
                              <input type="hidden" name="id" value={row.id} />
                              <textarea
                                name="response"
                                rows={2}
                                placeholder="رسالة اختيارية ستظهر للمزوّد عند فتح التعديل"
                                className={s.reviewTextarea}
                              />
                              <button className={s.primaryBtn} type="submit">
                                افتح التعديل للمزوّد
                              </button>
                            </form>
                            <form action={rejectCampaignEditRequest}>
                              <input type="hidden" name="id" value={row.id} />
                              <textarea
                                name="reason"
                                rows={2}
                                placeholder="اكتب سبب رفض طلب التعديل"
                                className={s.reviewTextarea}
                              />
                              <button type="submit" className={s.dangerBtn}>
                                رفض طلب التعديل
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
    </div>
  );
}
