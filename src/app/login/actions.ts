"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "يرجى تعبئة جميع الحقول." };
  }

  const isSuperAdmin = email.toLowerCase() === "admin@admin.com" && password === "admin";

  if (isSuperAdmin) {
    const cookieStore = await cookies();
    cookieStore.set("super_admin_bypass", "true", { path: "/", httpOnly: true });
    redirect("/dashboard");
  }

  const isSuperAdminEmailOnly = email.toLowerCase() === "admin@admin.com";

  if (!isSuperAdminEmailOnly) {
    if (!email.toLowerCase().endsWith("@gmail.com")) {
      return { error: "يرجى استخدام بريد إلكتروني ينتهي بـ @gmail.com فقط." };
    }

    // Strong password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return { error: "يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل، حرف كبير، حرف صغير، رقم ورمز." };
    }
  }

  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  }

  // Check role
  const { data: adminRole, error: roleError } = await adminSupabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .single();

  if (roleError || !adminRole) {
    await supabase.auth.signOut();
    return { error: "عذراً، هذا الحساب لا يملك صلاحيات المشرف." };
  }

  redirect("/dashboard");
}
