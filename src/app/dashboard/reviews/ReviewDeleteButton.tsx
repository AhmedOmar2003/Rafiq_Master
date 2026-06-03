"use client";

import { Trash2 } from "lucide-react";
import { deleteReview } from "./actions";
import styles from "../places/page.module.css";
import ConfirmDestructiveButton from "../ConfirmDestructiveButton";

export default function ReviewDeleteButton({ reviewId }: { reviewId: number }) {
  return (
    <ConfirmDestructiveButton
      title="حذف التقييم"
      message="سيتم حذف هذا التقييم نهائيًا من لوحة التحكم. لا يمكن التراجع بعد التأكيد."
      confirmLabel="تأكيد الحذف"
      pendingLabel="جارٍ الحذف..."
      onConfirm={() => deleteReview(reviewId)}
      triggerClassName={styles.deleteButton}
      triggerTitle="حذف"
      triggerStyle={{ cursor: "pointer" }}
    >
      <Trash2 size={18} />
    </ConfirmDestructiveButton>
  );
}
