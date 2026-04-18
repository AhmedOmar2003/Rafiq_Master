"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Save, Image as ImageIcon } from "lucide-react";
import styles from "./page.module.css";
import { createPlace } from "../actions";

const CITY_OPTIONS = ["القاهرة", "المنصورة", "الإسكندرية", "طنطا", "أي حتة"];
const BUDGET_OPTIONS = [
  "أقل من 100 جنيه",
  "100 إلى 500 جنيه",
  "500 إلى 1000 جنيه",
  "1000 إلى 1500 جنيه",
  "لسه محددتش",
];
const ACTIVITY_OPTIONS = ["طعام", "ترفيه", "سياحي", "رياضة", "فاجئني"];

export default function NewPlacePage() {
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");

  const [state, formAction, isPending] = useActionState(
    async (_prevState: any, formData: FormData) => createPlace(formData),
    null
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>إضافة مكان جديد</h1>
        <Link href="/dashboard/places" className={styles.backButton}>
          العودة للقائمة
          <ArrowRight size={20} />
        </Link>
      </div>

      <div className={styles.formCard}>
        {state?.error && (
          <div
            style={{
              color: "var(--color-danger)",
              backgroundColor: "var(--color-danger-alpha)",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              marginBottom: "1.5rem",
            }}
          >
            {state.error}
          </div>
        )}

        <form action={formAction} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="place_name" className={styles.label}>
              اسم المكان *
            </label>
            <input type="text" id="place_name" name="place_name" required className={styles.input} />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="city_name" className={styles.label}>
              المدينة *
            </label>
            <select id="city_name" name="city_name" required className={styles.input} defaultValue="">
              <option value="" disabled>
                اختر المدينة
              </option>
              {CITY_OPTIONS.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="activity_name" className={styles.label}>
              نوع النشاط *
            </label>
            <select
              id="activity_name"
              name="activity_name"
              required
              className={styles.input}
              defaultValue=""
            >
              <option value="" disabled>
                اختر نوع النشاط
              </option>
              {ACTIVITY_OPTIONS.map((activity) => (
                <option key={activity} value={activity}>
                  {activity}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="budget" className={styles.label}>
              الميزانية *
            </label>
            <select id="budget" name="budget" required className={styles.input} defaultValue="">
              <option value="" disabled>
                اختر الميزانية
              </option>
              {BUDGET_OPTIONS.map((budget) => (
                <option key={budget} value={budget}>
                  {budget}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup + " " + styles.fullWidth}>
            <label htmlFor="place_address" className={styles.label}>
              العنوان التفصيلي
            </label>
            <input type="text" id="place_address" name="place_address" className={styles.input} />
          </div>

          <div className={styles.inputGroup + " " + styles.fullWidth}>
            <label htmlFor="description" className={styles.label}>
              الوصف *
            </label>
            <textarea id="description" name="description" required className={styles.textarea} />
          </div>

          <div className={styles.inputGroup + " " + styles.fullWidth}>
            <label htmlFor="image_path" className={styles.label}>
              رابط الصورة (URL)
            </label>
            <input
              type="text"
              id="image_path"
              name="image_path"
              className={styles.input}
              dir="ltr"
              onChange={(e) => setImagePreviewUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />

            <div className={styles.imagePreview}>
              {imagePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreviewUrl}
                  alt="Preview"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <ImageIcon size={32} />
                  <span>معاينة الصورة ستظهر هنا</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.fullWidth} style={{ marginTop: "1rem" }}>
            <button type="submit" className={styles.submitButton} disabled={isPending}>
              {isPending ? (
                "جاري الحفظ..."
              ) : (
                <>
                  <Save size={20} />
                  حفظ المكان
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
