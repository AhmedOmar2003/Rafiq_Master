"use client";

import { useActionState } from "react";
import { login } from "./actions";
import styles from "./page.module.css";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type LoginState = {
  error?: string;
} | null;

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    async (_prevState, formData) => login(formData),
    null,
  );

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>تسجيل الدخول</h1>
        <p className={styles.subtitle}>لوحة تحكم رفيق الإدارية</p>

        {state?.error && <div className={styles.error}>{state.error}</div>}

        <form action={formAction} className={styles.form}>
          <Input
            label="البريد الإلكتروني"
            type="email"
            id="email"
            name="email"
            required
            placeholder="name@example.com"
            dir="ltr"
          />

          <Input
            label="كلمة المرور"
            type="password"
            id="password"
            name="password"
            required
            placeholder="••••"
            dir="ltr"
          />

          <Button type="submit" fullWidth isLoading={isPending}>
            {isPending ? "جاري الدخول..." : "دخول"}
          </Button>
        </form>
      </div>
    </div>
  );
}
