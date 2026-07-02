"use client";

import { useActionState } from "react";
import Link from "next/link";
import styles from "../page.module.css";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requestPasswordReset } from "./actions";

type ForgotPasswordState = {
  message?: string;
  error?: string;
} | null;

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordReset,
    null,
  );

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand-logo.png"
          alt="على فين؟"
          className={styles.logo}
        />
        <h1 className={styles.title}>نسيت كلمة السر؟</h1>
        <p className={styles.subtitle}>هنبعت لك رابط استرجاع على بريدك الإلكتروني</p>

        {state?.error && <div className={styles.error}>{state.error}</div>}
        {state?.message && <div className={styles.success}>{state.message}</div>}

        <form action={formAction} className={styles.form}>
          <fieldset
            className={styles.fieldset}
            disabled={isPending}
            aria-busy={isPending}
          >
            <Input
              label="البريد الإلكتروني"
              type="email"
              id="email"
              name="email"
              required
              placeholder="name@example.com"
              dir="ltr"
            />

            <Button type="submit" fullWidth isLoading={isPending}>
              {isPending ? "جارٍ إرسال الرابط..." : "إرسال رابط الاسترجاع"}
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
