"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

type ForgotPasswordState = {
  message?: string;
  error?: string;
} | null;

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { error: "اكتب البريد الإلكتروني عشان نبعت لك رابط الاسترجاع." };
  }

  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ??
    requestHeaders.get("referer")?.match(/^https?:\/\/[^/]+/)?.[0] ??
    "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/login/reset-password`,
  });

  if (error) {
    return { error: "معرفناش نبعت الرابط دلوقتي. جرّب تاني بعد شوية." };
  }

  return {
    message: "لو البريد موجود، هنرسل له رابط استرجاع كلمة السر خلال لحظات.",
  };
}
