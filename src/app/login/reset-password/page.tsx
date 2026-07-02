"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../page.module.css";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { isStrongPassword, passwordRequirementMessage } from "@/lib/security/password";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isChecking, setIsChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setHasRecoverySession(Boolean(data.session));
        setIsChecking(false);
      })
      .catch(() => {
        if (!mounted) return;
        setHasRecoverySession(false);
        setIsChecking(false);
      });

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const passwordError =
    password.length > 0 && !isStrongPassword(password)
      ? passwordRequirementMessage()
      : "";
  const confirmError =
    confirmPassword.length > 0 && confirmPassword !== password
      ? "الكلمتين مش متطابقين."
      : "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!hasRecoverySession) {
      setError("افتح رابط الاسترجاع من الإيميل الأول، أو اطلب رابط جديد.");
      return;
    }

    if (!isStrongPassword(password)) {
      setError(passwordRequirementMessage());
      return;
    }

    if (password !== confirmPassword) {
      setError("الكلمتين مش متطابقين.");
      return;
    }

    setIsSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setIsSaving(false);

    if (updateError) {
      setError("معرفناش نحدّث كلمة السر دلوقتي. جرّب تاني بعد شوية.");
      return;
    }

    setMessage("تم تحديث كلمة السر بنجاح. هتنقلك لتسجيل الدخول دلوقتي.");
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login"), 900);
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand-logo.png"
          alt="على فين؟"
          className={styles.logo}
        />
        <h1 className={styles.title}>تعيين كلمة سر جديدة</h1>
        <p className={styles.subtitle}>اختار كلمة قوية واحتفظ بيها في مكان آمن</p>

        {isChecking && <div className={styles.success}>بنجهّز رابط الاسترجاع...</div>}
        {!isChecking && !hasRecoverySession && (
          <div className={styles.error}>
            الرابط غير صالح أو انتهت صلاحيته. اطلب رابط استرجاع جديد من{" "}
            <Link href="/login/forgot-password" className={styles.forgotLink}>
              صفحة نسيت كلمة السر
            </Link>
            .
          </div>
        )}
        {error && <div className={styles.error}>{error}</div>}
        {message && <div className={styles.success}>{message}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <fieldset
            className={styles.fieldset}
            disabled={isSaving || isChecking || !hasRecoverySession}
            aria-busy={isSaving || isChecking}
          >
            <Input
              label="كلمة السر الجديدة"
              type="password"
              id="password"
              name="password"
              required
              placeholder="مثال: Ahmed11#"
              autoComplete="new-password"
              dir="ltr"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              helperText={passwordRequirementMessage()}
              error={passwordError}
            />

            <Input
              label="تأكيد كلمة السر"
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              placeholder="اكتبها مرة تانية"
              autoComplete="new-password"
              dir="ltr"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={confirmError}
            />

            <Button type="submit" fullWidth isLoading={isSaving}>
              {isSaving ? "جارٍ حفظ كلمة السر..." : "حفظ كلمة السر"}
            </Button>

            <div className={styles.footerRow}>
              <Link href="/login" className={styles.forgotLink}>
                رجوع لتسجيل الدخول
              </Link>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
