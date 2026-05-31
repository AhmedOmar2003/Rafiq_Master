"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { currentAdminRole } from "@/lib/auth/role";

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
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw new Error(`فشل حذف الحساب: ${error.message}`);

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/providers");
}
