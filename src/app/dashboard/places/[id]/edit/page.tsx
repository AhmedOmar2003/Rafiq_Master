import Link from "next/link";
import { ArrowRight, Save } from "lucide-react";
import styles from "../../new/page.module.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { updatePlace } from "../../actions";

type PlaceRow = {
  place_id: number;
  place_name: string;
  description: string;
  budget: string;
  price_range: string;
  rating: number;
  place_address: string;
  image_path: string | null;
  activity_name: string;
  city_name: string;
};

const CITY_OPTIONS = ["القاهرة", "المنصورة", "الإسكندرية", "طنطا", "أي حتة"];
const BUDGET_OPTIONS = [
  "أقل من 100 جنيه",
  "100 إلى 500 جنيه",
  "500 إلى 1000 جنيه",
  "1000 إلى 1500 جنيه",
  "لسه محددتش",
];
const ACTIVITY_OPTIONS = ["طعام", "ترفيه", "سياحي", "رياضة", "فاجئني"];

export default async function EditPlacePage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const { id } = await params;
  const placeId = Number(id);

  if (Number.isNaN(placeId)) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>تعديل مكان</h1>
          <Link href="/dashboard/places" className={styles.backButton}>
            العودة للقائمة
            <ArrowRight size={20} />
          </Link>
        </div>

        <div className={styles.formCard}>
          <p style={{ color: "#b91c1c", fontWeight: 600 }}>رقم المكان غير صحيح.</p>
        </div>
      </div>
    );
  }

  const supabase = createAdminClient();
  const { data: place, error } = await supabase
    .from("places")
    .select("*")
    .eq("place_id", placeId)
    .single();

  if (error || !place) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>تعديل مكان</h1>
          <Link href="/dashboard/places" className={styles.backButton}>
            العودة للقائمة
            <ArrowRight size={20} />
          </Link>
        </div>

        <div className={styles.formCard}>
          <p style={{ color: "#b91c1c", fontWeight: 600 }}>
            لم نستطع العثور على هذا المكان. ربما تم حذفه أو أن رقم المعرف غير موجود.
          </p>
        </div>
      </div>
    );
  }

  const currentPlace = place as PlaceRow;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>تعديل مكان</h1>
        <Link href="/dashboard/places" className={styles.backButton}>
          العودة للقائمة
          <ArrowRight size={20} />
        </Link>
      </div>

      <div className={styles.formCard}>
        <form action={updatePlace.bind(null, placeId)} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="place_name" className={styles.label}>
              اسم المكان *
            </label>
            <input
              type="text"
              id="place_name"
              name="place_name"
              required
              className={styles.input}
              defaultValue={currentPlace.place_name}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="city_name" className={styles.label}>
              المدينة *
            </label>
            <select
              id="city_name"
              name="city_name"
              required
              className={styles.input}
              defaultValue={currentPlace.city_name || ""}
            >
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
              defaultValue={currentPlace.activity_name || ""}
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
            <select
              id="budget"
              name="budget"
              required
              className={styles.input}
              defaultValue={currentPlace.budget || currentPlace.price_range || ""}
            >
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
            <input
              type="text"
              id="place_address"
              name="place_address"
              className={styles.input}
              defaultValue={currentPlace.place_address}
            />
          </div>

          <div className={styles.inputGroup + " " + styles.fullWidth}>
            <label htmlFor="description" className={styles.label}>
              الوصف *
            </label>
            <textarea
              id="description"
              name="description"
              required
              className={styles.textarea}
              defaultValue={currentPlace.description}
            />
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
              defaultValue={currentPlace.image_path || ""}
              placeholder="https://example.com/image.jpg"
            />
            <div className={styles.imagePreview}>
              {currentPlace.image_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentPlace.image_path} alt={currentPlace.place_name} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <span>لا توجد صورة حالياً</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="rating" className={styles.label}>
              التقييم المبدئي (0 - 5)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              id="rating"
              name="rating"
              defaultValue={currentPlace.rating}
              className={styles.input}
            />
          </div>

          <div className={styles.fullWidth} style={{ marginTop: "1rem" }}>
            <button type="submit" className={styles.submitButton}>
              <Save size={20} />
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
