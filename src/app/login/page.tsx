"use client";

import { useActionState } from "react";
import { login } from "./actions";
import styles from "./page.module.css";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return await login(formData);
    },
    null
  );

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>تسجيل الدخول</h1>
        <p className={styles.subtitle}>لوحة تحكم رفيق الإدارية</p>

        {state?.error && <div className={styles.error}>{state.error}</div>}

        <form action={formAction} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              البريد الإلكتروني (@gmail.com أو Super Admin)
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className={styles.input}
              placeholder="admin@admin.com"
              dir="ltr"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              كلمة المرور
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              className={styles.input}
              placeholder="••••"
              dir="ltr"
            />
          </div>

          <button type="submit" className={styles.button} disabled={isPending}>
            {isPending ? "جاري الدخول..." : (
              <>
                <LogIn size={18} style={{ marginLeft: "8px" }} />
                دخول
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
