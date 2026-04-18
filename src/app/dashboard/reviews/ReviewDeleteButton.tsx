"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteReview } from "./actions";
import styles from "../places/page.module.css";

export default function ReviewDeleteButton({ reviewId }: { reviewId: number }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (window.confirm("هل أنت متأكد من حذف هذا التقييم؟")) {
      startTransition(async () => {
        await deleteReview(reviewId);
      });
    }
  };

  return (
    <button 
      onClick={handleDelete} 
      className={styles.deleteButton} 
      title="حذف"
      disabled={isPending}
      style={{ opacity: isPending ? 0.5 : 1, cursor: isPending ? "not-allowed" : "pointer" }}
    >
      <Trash2 size={18} />
    </button>
  );
}
