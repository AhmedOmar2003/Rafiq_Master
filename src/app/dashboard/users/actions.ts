"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSsrClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { currentAdminRole } from "@/lib/auth/role";

type ProviderIdRow = { id: string };
type PlaceIdRow = { id: string; image_path: string | null };
type StoragePathRow = { storage_path: string | null };

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

function parsePlaceImagePathFromPublicUrl(value: string | null): string | null {
  if (!value) return null;
  const marker = "/storage/v1/object/public/place-images/";
  const idx = value.indexOf(marker);
  if (idx === -1) return null;
  const path = value.slice(idx + marker.length).trim();
  return path.length > 0 ? decodeURIComponent(path) : null;
}

async function cleanupUserStorage(userId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: providerRows, error: providerError } = await supabase
    .from("providers")
    .select("id")
    .eq("owner_id", userId);

  if (providerError) {
    throw new Error(
      `تعذر تحميل مقدمي الخدمة المرتبطين بالحساب قبل الحذف: ${providerError.message}`,
    );
  }

  const providerIds = ((providerRows ?? []) as ProviderIdRow[])
    .map((row) => row.id)
    .filter(Boolean);

  if (providerIds.length === 0) return;

  const { data: placeRowsRaw, error: placesError } = await supabase
    .from("places")
    .select("id, image_path")
    .in("provider_id", providerIds);

  if (placesError) {
    throw new Error(`تعذر تحميل أماكن الحساب قبل الحذف: ${placesError.message}`);
  }

  const placeRows = (placeRowsRaw ?? []) as PlaceIdRow[];
  const placeIds = placeRows.map((row) => row.id).filter(Boolean);
  const placeImagePaths = new Set<string>();

  for (const row of placeRows) {
    const parsed = parsePlaceImagePathFromPublicUrl(row.image_path);
    if (parsed) placeImagePaths.add(parsed);
  }

  if (placeIds.length > 0) {
    const { data: galleryRows, error: galleryError } = await supabase
      .from("place_images")
      .select("storage_path")
      .in("place_id", placeIds);

    if (galleryError) {
      throw new Error(`تعذر تحميل صور الأماكن قبل الحذف: ${galleryError.message}`);
    }

    for (const row of (galleryRows ?? []) as StoragePathRow[]) {
      const path = row.storage_path?.trim();
      if (path) placeImagePaths.add(path);
    }
  }

  const { data: documentRows, error: docsError } = await supabase
    .from("provider_documents")
    .select("storage_path")
    .in("provider_id", providerIds);

  if (docsError) {
    throw new Error(`تعذر تحميل مستندات الحساب قبل الحذف: ${docsError.message}`);
  }

  const providerDocumentPaths = ((documentRows ?? []) as StoragePathRow[])
    .map((row) => row.storage_path?.trim() ?? "")
    .filter(Boolean);

  for (const batch of chunk([...placeImagePaths], 100)) {
    const { error } = await supabase.storage.from("place-images").remove(batch);
    if (error) {
      throw new Error(`تعذر حذف صور الأماكن من التخزين: ${error.message}`);
    }
  }

  for (const batch of chunk(providerDocumentPaths, 100)) {
    const { error } = await supabase.storage.from("provider-documents").remove(batch);
    if (error) {
      throw new Error(`تعذر حذف مستندات الحساب من التخزين: ${error.message}`);
    }
  }
}

/**
 * Create a new account with the chosen role + permissions in a single call.
 *
 * Flow per role:
 *   user      → just auth user (handle_new_user trigger seeds profiles + user_roles=user)
 *   provider  → auth user + providers row inserted server-side with the
 *               supplied business_name. The user can log in and skip the
 *               onboarding subscription step from the mobile app.
 *   admin     → auth user + admin_roles row (role='admin')
 *   super_admin → auth user + admin_roles row (role='super_admin')
 *
 * Idempotency: if creation partially fails (e.g. auth user created but
 * the role row insert failed), the auth user is rolled back. That keeps
 * the system from accumulating ghost accounts.
 */
export type NewUserInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: "user" | "provider" | "admin" | "super_admin";
  /** Required when role === 'provider'. */
  businessName?: string;
};

export async function createUser(input: NewUserInput): Promise<{ id: string }> {
  // Defense in depth: even if a regular admin reaches this action by hand-
  // crafting the request, we re-check the role server-side. Only the super
  // admin (the platform owner) gets to create accounts.
  if ((await currentAdminRole()) !== "super_admin") {
    throw new Error("صلاحية غير كافية");
  }

  const supabase = createAdminClient();

  if (!input.email?.includes("@")) {
    throw new Error("صيغة الإيميل غير صحيحة");
  }
  const finalPassword = input.password.trim();
  if (!finalPassword || finalPassword.length < 8) {
    throw new Error("كلمة المرور لازم ٨ أحرف على الأقل");
  }
  if (!input.fullName?.trim()) {
    throw new Error("اسم المستخدم مطلوب");
  }
  if (input.role === "provider" && !input.businessName?.trim()) {
    throw new Error("اسم النشاط مطلوب لمقدّم الخدمة");
  }

  // 1. Create the auth user.
  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email: input.email.trim().toLowerCase(),
      password: finalPassword,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName.trim(),
        phone: input.phone?.trim() || null,
      },
    });
  if (createErr || !created?.user) {
    throw new Error(`فشل إنشاء الحساب: ${createErr?.message ?? "غير معروف"}`);
  }
  const userId = created.user.id;

  try {
    // 2a. Admin role → admin_roles
    if (input.role === "admin" || input.role === "super_admin") {
      const { error: roleErr } = await supabase
        .from("admin_roles")
        .insert({ user_id: userId, role: input.role } as never);
      if (roleErr) throw new Error(`فشل تعيين دور الإدارة: ${roleErr.message}`);
    }

    // 2b. Provider role → providers row + user_roles entry.
    //     handle_new_user already inserts a default user_roles=user; we
    //     additionally insert a 'provider' role here.
    if (input.role === "provider") {
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "provider" } as never);
      // unique (user_id, role) so duplicate is ok
      if (roleErr && !/duplicate/i.test(roleErr.message)) {
        throw new Error(`فشل تعيين دور مقدّم الخدمة: ${roleErr.message}`);
      }

      const { error: provErr } = await supabase
        .from("providers")
        .insert({
          owner_id: userId,
          business_name: input.businessName!.trim(),
          contact_email: input.email.trim().toLowerCase(),
          contact_phone: input.phone?.trim() || null,
          status: "approved", // admin-created providers are trusted
          approved_at: new Date().toISOString(),
        } as never);
      if (provErr) throw new Error(`فشل إنشاء صف مقدّم الخدمة: ${provErr.message}`);
    }
  } catch (e) {
    // Roll back the auth user so we don't leave a half-provisioned account.
    await supabase.auth.admin.deleteUser(userId).catch(() => {});
    throw e instanceof Error ? e : new Error(String(e));
  }

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/providers");
  return { id: userId };
}

/**
 * Update a user's admin role (promote/demote/clear).
 * Pass role=null to revoke admin privileges.
 */
export async function setAdminRole(
  userId: string,
  role: "admin" | "super_admin" | null,
): Promise<void> {
  if ((await currentAdminRole()) !== "super_admin") {
    throw new Error("صلاحية غير كافية");
  }
  const supabase = createAdminClient();

  if (role === null) {
    const { error } = await supabase
      .from("admin_roles")
      .delete()
      .eq("user_id", userId);
    if (error) throw new Error(`فشل إلغاء دور الإدارة: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("admin_roles")
      .upsert({ user_id: userId, role } as never, { onConflict: "user_id" });
    if (error) throw new Error(`فشل تحديث دور الإدارة: ${error.message}`);
  }

  revalidatePath("/dashboard/users");
}

/**
 * Hard-delete a user account (auth + cascades through profiles, providers,
 * places, reviews via the FK constraints).
 */
export async function deleteUser(userId: string): Promise<void> {
  if ((await currentAdminRole()) !== "super_admin") {
    throw new Error("صلاحية غير كافية");
  }

  const supabase = createAdminClient();
  const sessionClient = await createSsrClient();
  const {
    data: { user: currentUser },
  } = await sessionClient.auth.getUser();

  if (currentUser?.id === userId) {
    throw new Error("لا يمكنك حذف حسابك الحالي من لوحة التحكم");
  }

  const { data: adminRoleRow } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  const targetAdminRole = (adminRoleRow as { role: "admin" | "super_admin" } | null)?.role;
  if (targetAdminRole === "super_admin") {
    const { count, error: countError } = await supabase
      .from("admin_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "super_admin");

    if (countError) {
      throw new Error(`تعذر التحقق من عدد المشرفين الأعلى: ${countError.message}`);
    }
    if ((count ?? 0) <= 1) {
      throw new Error("لا يمكن حذف آخر مشرف أعلى في النظام");
    }
  }

  await cleanupUserStorage(userId);

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw new Error(`فشل حذف الحساب: ${error.message}`);

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/providers");
  revalidatePath("/dashboard/reports");
}
