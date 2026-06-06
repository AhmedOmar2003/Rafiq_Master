"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { AlertTriangle } from "lucide-react";
import { createPortal } from "react-dom";
import styles from "./ConfirmDestructiveButton.module.css";

type ConfirmDestructiveButtonProps = {
  title: string;
  message: string;
  children: ReactNode;
  triggerTitle?: string;
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  disabled?: boolean;
  onConfirm?: () => Promise<void> | void;
  formAction?: () => Promise<void> | void;
};

export default function ConfirmDestructiveButton({
  title,
  message,
  children,
  triggerTitle,
  triggerClassName,
  triggerStyle,
  confirmLabel = "تأكيد الحذف",
  cancelLabel = "إلغاء",
  pendingLabel = "جارٍ الحذف...",
  disabled = false,
  onConfirm,
  formAction,
}: ConfirmDestructiveButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const bodyId = useId();

  const isBusy = disabled || submitting || isPending;

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function close() {
    if (isBusy) return;
    setOpen(false);
  }

  function handleConfirm() {
    if (isBusy) return;

    if (onConfirm) {
      startTransition(async () => {
        await onConfirm();
        setOpen(false);
      });
      return;
    }

    if (formAction) {
      setSubmitting(true);
      formRef.current?.requestSubmit();
    }
  }

  return (
    <>
      {formAction && <form ref={formRef} action={formAction} />}

      <button
        type="button"
        title={triggerTitle}
        className={triggerClassName}
        style={triggerStyle}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className={styles.overlay}
              onClick={(event) => {
                if (event.target === event.currentTarget) close();
              }}
            >
              <div
                className={styles.card}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={bodyId}
              >
                <div className={styles.header}>
                  <div className={styles.iconWrap}>
                    <AlertTriangle size={26} strokeWidth={2.4} />
                  </div>
                  <h3 id={titleId} className={styles.title}>
                    {title}
                  </h3>
                </div>

                <p id={bodyId} className={styles.body}>{message}</p>

                <div className={styles.actions}>
                  <button
                    type="button"
                    onClick={close}
                    className={styles.cancelBtn}
                    disabled={isBusy}
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className={styles.confirmBtn}
                    disabled={isBusy}
                  >
                    {isBusy ? pendingLabel : confirmLabel}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
