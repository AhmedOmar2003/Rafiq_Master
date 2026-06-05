import s from "@/app/dashboard/shared.module.css";

/**
 * Consistent status badge for all admin tables.
 *
 * Maps status strings → shared.module.css badge class + Arabic label.
 * Always use this component for status display; never inline raw badge classes.
 *
 * Supported statuses:
 *   pending / pending_review  → ذهبي  "قيد المراجعة"
 *   approved / active         → أخضر  "معتمد" / "نشط"
 *   rejected                  → أحمر  "مرفوض"
 *   suspended                 → رمادي "موقوف"
 *   under_review              → بنفسجي "تحت المراجعة الآن"
 *   open                      → أحمر  "مفتوح"
 *   closed / resolved         → رمادي "مغلق"
 *
 * Unknown statuses fall back to a neutral gray badge showing the raw value.
 */
export function StatusBadge({ status }: { status: string | null | undefined }) {
  const normalized = (status ?? "").toLowerCase().trim();

  const config = resolveConfig(normalized, status);

  return (
    <span className={`${s.badge} ${config.cls}`} aria-label={config.label}>
      {config.label}
    </span>
  );
}

type BadgeConfig = { cls: string; label: string };

function resolveConfig(normalized: string, raw: string | null | undefined): BadgeConfig {
  switch (normalized) {
    case "pending":
    case "pending_review":
      return { cls: s.badgeGold, label: "قيد المراجعة" };

    case "approved":
      return { cls: s.badgeSuccess, label: "معتمد" };

    case "active":
      return { cls: s.badgeSuccess, label: "نشط" };

    case "rejected":
      return { cls: s.badgeDanger, label: "مرفوض" };

    case "suspended":
      return { cls: s.badgeGray, label: "موقوف" };

    case "under_review":
    case "reviewing":
      return { cls: s.badgePurple, label: "تحت المراجعة الآن" };

    case "open":
      return { cls: s.badgeDanger, label: "مفتوح" };

    case "closed":
    case "resolved":
      return { cls: s.badgeGray, label: "مغلق" };

    case "trialing":
      return { cls: s.badgePrimary, label: "تجريبي" };

    case "past_due":
      return { cls: s.badgeDanger, label: "متأخر السداد" };

    case "actioned":
      return { cls: s.badgeSuccess, label: "تم اتخاذ إجراء" };

    case "reviewed":
      return { cls: s.badgePrimary, label: "تمت المراجعة" };

    case "dismissed":
      return { cls: s.badgeGray, label: "مغلق" };

    case "paused":
      return { cls: s.badgeGray, label: "موقوف" };

    case "ended":
      return { cls: s.badgeGray, label: "منتهي" };

    case "draft":
      return { cls: s.badgeGray, label: "مسودة" };

    case "canceled":
    case "cancelled":
      return { cls: s.badgeGray, label: "ملغي" };

    case "expired":
      return { cls: s.badgeGray, label: "منتهي" };

    default:
      return { cls: s.badgeGray, label: raw ?? "—" };
  }
}
