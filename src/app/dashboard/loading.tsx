import { MapPin } from "lucide-react";
import s from "./shared.module.css";

export default function DashboardLoading() {
  return (
    <div className={s.page} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100%", height: "100%", background: "transparent" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <div 
          style={{ 
            width: 54, height: 54, borderRadius: "16px", 
            background: "var(--color-primary-alpha)", 
            display: "flex", alignItems: "center", justifyContent: "center", 
            color: "var(--color-primary)",
            boxShadow: "inset 0 0 0 1.5px rgba(104, 31, 0, 0.08)",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
          }}
        >
          <MapPin size={26} style={{ animation: "bounce 2s infinite" }} />
        </div>
        <p style={{ color: "var(--color-gray)", fontWeight: 700, fontSize: "0.95rem", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>
          جاري جلب البيانات...
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
