"use client";

import { useState, useTransition } from "react";
import { Plus, X, User, Mail, Lock, Phone, Store, Shield, ShieldCheck } from "lucide-react";
import { createUser, type NewUserInput } from "./actions";

type Role = NewUserInput["role"];

const ROLE_OPTIONS: { value: Role; label: string; icon: typeof User; desc: string }[] = [
  { value: "user",        label: "مستخدم عادي",  icon: User,        desc: "يتصفح الأماكن ويقيّم" },
  { value: "provider",    label: "مقدّم خدمة",   icon: Store,       desc: "يضيف ويدير أماكن" },
  { value: "admin",       label: "مشرف",          icon: Shield,      desc: "يدخل لوحة التحكم ويعدّل" },
  { value: "super_admin", label: "مشرف أعلى",     icon: ShieldCheck, desc: "صلاحيات كاملة" },
];

export default function AddUserButton() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewUserInput>({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    role: "user",
    businessName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
    setSuccess(false);
    setForm({ email: "", password: "", fullName: "", phone: "", role: "user", businessName: "" });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await createUser(form);
        setSuccess(true);
        // Auto-close after 1s so the admin can chain multiple users.
        setTimeout(close, 1200);
      } catch (e) {
        setError(e instanceof Error ? e.message : "حصل خطأ غير متوقع");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          background: "var(--color-primary)", color: "#fff",
          border: "none", padding: "0.7rem 1.2rem",
          borderRadius: "var(--radius-md)", cursor: "pointer",
          fontWeight: 700, fontSize: "0.92rem",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <Plus size={18} />
        إضافة مستخدم
      </button>

      {open && (
        <div
          onClick={(e) => e.target === e.currentTarget && close()}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: "1rem",
          }}
        >
          <div style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-xl)",
            padding: "1.75rem",
            width: "min(520px, 100%)",
            maxHeight: "92vh", overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: "rgba(104,31,0,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Plus size={22} style={{ color: "var(--color-primary)" }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: "1.1rem" }}>
                  إضافة مستخدم جديد
                </h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-text-tertiary)" }}>
                  بياناته يقدر يدخل بيها التطبيق أو اللوحة فوراً
                </p>
              </div>
              <button onClick={close} disabled={pending} style={{
                marginRight: "auto", background: "none", border: "none",
                cursor: pending ? "not-allowed" : "pointer",
                color: "var(--color-text-tertiary)", padding: 4,
              }}>
                <X size={20} />
              </button>
            </div>

            {/* Role picker — first so the form below adapts */}
            <Label icon={<Shield size={14} />} text="نوع الحساب" />
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "0.55rem", marginBottom: "1.1rem",
            }}>
              {ROLE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = form.role === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: opt.value }))}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "flex-start",
                      gap: "0.25rem",
                      padding: "0.7rem 0.85rem",
                      border: `1.5px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
                      background: selected ? "var(--color-primary-subtle)" : "var(--color-surface)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer", textAlign: "right",
                    }}
                  >
                    <Icon size={16} color={selected ? "var(--color-primary)" : "var(--color-text-tertiary)"} />
                    <span style={{
                      fontWeight: 800, fontSize: "0.86rem",
                      color: selected ? "var(--color-primary)" : "var(--color-text-primary)",
                    }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--color-text-tertiary)" }}>
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            <Label icon={<User size={14} />} text="الاسم الكامل *" />
            <Input value={form.fullName} onChange={(v) => setForm((f) => ({ ...f, fullName: v }))} placeholder="مثال: أحمد محمد" />

            {form.role === "provider" && (
              <>
                <Label icon={<Store size={14} />} text="اسم النشاط *" />
                <Input value={form.businessName ?? ""} onChange={(v) => setForm((f) => ({ ...f, businessName: v }))} placeholder="مثال: مطعم النجوم" />
              </>
            )}

            <Label icon={<Mail size={14} />} text="البريد الإلكتروني *" />
            <Input
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              placeholder="user@example.com"
              type="email"
              dir="ltr"
            />

            <Label icon={<Lock size={14} />} text="كلمة المرور * (٨ أحرف على الأقل)" />
            <Input
              value={form.password}
              onChange={(v) => setForm((f) => ({ ...f, password: v }))}
              type="password"
              placeholder="••••••••"
              dir="ltr"
            />

            <Label icon={<Phone size={14} />} text="رقم الموبايل (اختياري)" />
            <Input
              value={form.phone ?? ""}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              placeholder="01000000000"
              dir="ltr"
            />

            {error && (
              <div style={{
                marginTop: "0.85rem", padding: "0.7rem 0.85rem",
                background: "rgba(220,38,38,0.10)", color: "#dc2626",
                borderRadius: "var(--radius-md)", fontSize: "0.85rem",
              }}>
                ❌ {error}
              </div>
            )}
            {success && (
              <div style={{
                marginTop: "0.85rem", padding: "0.7rem 0.85rem",
                background: "rgba(16,185,129,0.10)", color: "#10b981",
                borderRadius: "var(--radius-md)", fontSize: "0.85rem",
              }}>
                ✅ تم إنشاء الحساب بنجاح
              </div>
            )}

            <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.25rem" }}>
              <button
                onClick={close}
                disabled={pending}
                style={{
                  flex: 1, padding: "0.75rem",
                  border: "1.5px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  background: "none",
                  cursor: pending ? "not-allowed" : "pointer",
                  fontWeight: 700, fontSize: "0.9rem",
                }}
              >
                إلغاء
              </button>
              <button
                onClick={submit}
                disabled={pending}
                style={{
                  flex: 2, padding: "0.75rem",
                  background: "var(--color-primary)", color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  cursor: pending ? "not-allowed" : "pointer",
                  opacity: pending ? 0.6 : 1,
                  fontWeight: 800, fontSize: "0.9rem",
                }}
              >
                {pending ? "جارٍ الإنشاء…" : "إنشاء الحساب"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Label({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: "0.4rem",
      fontSize: "0.78rem", fontWeight: 700,
      color: "var(--color-text-secondary)",
      marginBottom: "0.35rem", marginTop: "0.85rem",
    }}>
      {icon} {text}
    </label>
  );
}

function Input({
  value, onChange, placeholder, type = "text", dir,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir={dir}
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "0.8rem 1rem",
        border: "1.5px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        fontSize: "0.92rem", fontFamily: "inherit",
        outline: "none",
        background: "var(--color-surface)",
        color: "var(--color-text-primary)",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "var(--color-primary)";
        e.target.style.boxShadow = "0 0 0 3px var(--color-primary-subtle)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "var(--color-border)";
        e.target.style.boxShadow = "none";
      }}
    />
  );
}
