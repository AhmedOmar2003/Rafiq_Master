"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const LOGIN_EMAIL_LIMIT = 5;
const LOGIN_IP_LIMIT = 15;
const LOGIN_WINDOW = "15 minutes";

type RateLimitResult = {
  data: boolean | null;
  error: { message: string } | null;
};

type LoginAttemptInsert = {
  email: string;
  ip_address: string | null;
  user_agent: string | null;
  succeeded: boolean;
  reason: string | null;
};

type AdminSupabaseLike = {
  rpc(
    name: "consume_rate_limit",
    args: {
      _bucket: string;
      _key: string;
      _limit: number;
      _window: string;
    }
  ): Promise<RateLimitResult>;
  from(table: "login_attempts"): {
    insert(values: LoginAttemptInsert): Promise<unknown>;
  };
  from(table: "admin_roles"): {
    select(columns: string): {
      eq(column: string, value: string): {
        single(): Promise<{
          data: { role: string } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

async function logLoginAttempt(params: {
  email: string;
  ip: string | null;
  userAgent: string | null;
  succeeded: boolean;
  reason: string | null;
}) {
  const adminSupabase = createAdminClient() as unknown as AdminSupabaseLike;
  await adminSupabase.from("login_attempts").insert({
    email: params.email,
    ip_address: params.ip,
    user_agent: params.userAgent,
    succeeded: params.succeeded,
    reason: params.reason,
  });
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "يرجى تعبئة جميع الحقول." };
  }

  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    null;
  const userAgent = requestHeaders.get("user-agent");
  const emailKey = email.toLowerCase();

  const adminSupabase = createAdminClient() as unknown as AdminSupabaseLike;
  const [emailThrottle, ipThrottle] = await Promise.all([
    adminSupabase.rpc("consume_rate_limit", {
      _bucket: "admin_login_email",
      _key: emailKey,
      _limit: LOGIN_EMAIL_LIMIT,
      _window: LOGIN_WINDOW,
    }),
    adminSupabase.rpc("consume_rate_limit", {
      _bucket: "admin_login_ip",
      _key: ip ?? "unknown",
      _limit: LOGIN_IP_LIMIT,
      _window: LOGIN_WINDOW,
    }),
  ]);

  if (emailThrottle.error || ipThrottle.error || !emailThrottle.data || !ipThrottle.data) {
    await logLoginAttempt({
      email: emailKey,
      ip,
      userAgent,
      succeeded: false,
      reason: "rate_limited",
    });
    return { error: "محاولات الدخول كثيرة جدًا. حاول مرة أخرى لاحقًا." };
  }

  const supabase = await createClient();

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    await logLoginAttempt({
      email: emailKey,
      ip,
      userAgent,
      succeeded: false,
      reason: "invalid_credentials",
    });
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
    await logLoginAttempt({
      email: emailKey,
      ip,
      userAgent,
      succeeded: false,
      reason: "not_admin",
    });
    return { error: "عذراً، هذا الحساب لا يملك صلاحيات الدخول." };
  }

  await logLoginAttempt({
    email: emailKey,
    ip,
    userAgent,
    succeeded: true,
    reason: null,
  });

  redirect("/dashboard");
}
