import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "var(--color-background)",
      padding: "1rem"
    }}>
      <div style={{
        backgroundColor: "var(--color-white)",
        padding: "3rem 2rem",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        textAlign: "center",
        maxWidth: "500px",
        width: "100%"
      }}>
        <ShieldAlert size={64} style={{ color: "var(--color-danger)", margin: "0 auto 1.5rem" }} />
        <h1 style={{ color: "var(--color-primary)", marginBottom: "1rem" }}>غير مصرح لك بالدخول</h1>
        <p style={{ color: "var(--color-gray)", marginBottom: "2rem", lineHeight: "1.6" }}>
          عذراً، هذا الحساب لا يملك الصلاحيات الكافية للوصول إلى لوحة التحكم الإدارية. يرجى تسجيل الدخول بحساب Super Admin.
        </p>
        <Link 
          href="/login" 
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-white)",
            fontWeight: "bold",
            padding: "0.75rem 1.5rem",
            borderRadius: "var(--radius-md)",
            display: "inline-block",
            transition: "background-color var(--transition-fast)"
          }}
        >
          العودة لتسجيل الدخول
        </Link>
      </div>
    </div>
  );
}
