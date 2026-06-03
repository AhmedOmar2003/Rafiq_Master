"use server";

import { revalidatePath } from "next/cache";
import { currentAdminRole } from "@/lib/auth/role";
import { logAdminAction } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSsrClient } from "@/lib/supabase/server";

type NotificationPreferences = {
  new_place: boolean;
  new_review: boolean;
  new_signup: boolean;
  weekly_reports: boolean;
};

type ModerationSla = {
  place_review_hours: number;
  campaign_review_hours: number;
};

type SupportProfile = {
  app_name_ar: string;
  app_name_en: string;
  support_email: string;
};

async function requireSuperAdminAction() {
  if ((await currentAdminRole()) !== "super_admin") {
    throw new Error("صلاحية غير كافية");
  }
}

async function currentUserId() {
  const sessionClient = await createSsrClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  return user?.id ?? null;
}

async function upsertPlatformSetting(
  key: string,
  value: NotificationPreferences | ModerationSla | SupportProfile,
) {
  const supabase = createAdminClient();
  const userId = await currentUserId();
  const { error } = await supabase.from("platform_settings").upsert(
    {
      key,
      value,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "key" },
  );

  if (error) {
    throw new Error(`فشل حفظ الإعدادات: ${error.message}`);
  }
}

export async function updateNotificationPreferences(formData: FormData): Promise<void> {
  await requireSuperAdminAction();

  const value: NotificationPreferences = {
    new_place: formData.get("new_place") === "on",
    new_review: formData.get("new_review") === "on",
    new_signup: formData.get("new_signup") === "on",
    weekly_reports: formData.get("weekly_reports") === "on",
  };

  await upsertPlatformSetting("notification_preferences", value);
  await logAdminAction({
    action: "update_platform_notifications",
    entityType: "platform_setting",
    entityId: null,
    payload: { ...value, key: "notification_preferences", source: "dashboard" },
  });

  revalidatePath("/dashboard/settings");
}

export async function updateModerationSla(formData: FormData): Promise<void> {
  await requireSuperAdminAction();

  const placeReviewHours = Number(formData.get("place_review_hours") ?? 24);
  const campaignReviewHours = Number(formData.get("campaign_review_hours") ?? 6);

  if (!Number.isFinite(placeReviewHours) || placeReviewHours < 1 || placeReviewHours > 168) {
    throw new Error("مدة مراجعة الأماكن يجب أن تكون بين ساعة واحدة و168 ساعة.");
  }
  if (!Number.isFinite(campaignReviewHours) || campaignReviewHours < 1 || campaignReviewHours > 168) {
    throw new Error("مدة مراجعة الإعلانات يجب أن تكون بين ساعة واحدة و168 ساعة.");
  }

  const value: ModerationSla = {
    place_review_hours: Math.round(placeReviewHours),
    campaign_review_hours: Math.round(campaignReviewHours),
  };

  await upsertPlatformSetting("moderation_sla", value);
  await logAdminAction({
    action: "update_platform_moderation_sla",
    entityType: "platform_setting",
    entityId: null,
    payload: { ...value, key: "moderation_sla", source: "dashboard" },
  });

  revalidatePath("/dashboard/settings");
}

export async function updateSupportProfile(formData: FormData): Promise<void> {
  await requireSuperAdminAction();

  const appNameAr = String(formData.get("app_name_ar") ?? "").trim();
  const appNameEn = String(formData.get("app_name_en") ?? "").trim();
  const supportEmail = String(formData.get("support_email") ?? "").trim().toLowerCase();

  if (!appNameAr) throw new Error("اسم التطبيق بالعربية مطلوب.");
  if (!appNameEn) throw new Error("اسم التطبيق بالإنجليزية مطلوب.");
  if (!supportEmail || !supportEmail.includes("@")) {
    throw new Error("البريد الإلكتروني للدعم غير صالح.");
  }

  const value: SupportProfile = {
    app_name_ar: appNameAr,
    app_name_en: appNameEn,
    support_email: supportEmail,
  };

  await upsertPlatformSetting("support_profile", value);
  await logAdminAction({
    action: "update_platform_support_profile",
    entityType: "platform_setting",
    entityId: null,
    payload: { ...value, key: "support_profile", source: "dashboard" },
  });

  revalidatePath("/dashboard/settings");
}
