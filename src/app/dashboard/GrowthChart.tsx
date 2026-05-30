"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";

type Row = { day: string; users: number; places: number };

/**
 * 14-day growth chart for new users and new places.
 *
 * Lives on /dashboard (overview). The data is bucketed server-side so this
 * component just renders — no fetching, no state. Two stacked areas keep
 * the comparison readable (users tends to be larger than places).
 */
export default function GrowthChart({ series }: { series: Row[] }) {
  const totalUsers = series.reduce((a, b) => a + b.users, 0);
  const totalPlaces = series.reduce((a, b) => a + b.places, 0);

  return (
    <div
      style={{
        background: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        padding: "1.5rem",
        marginBottom: "1.5rem",
        boxShadow: "var(--shadow-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(104,31,0,0.10)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TrendingUp size={20} />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.05rem",
                fontWeight: 800,
                color: "var(--color-text-primary)",
              }}
            >
              نمو آخر ١٤ يوم
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "0.78rem",
                color: "var(--color-text-tertiary)",
              }}
            >
              تسجيلات المستخدمين والأماكن المضافة يومياً
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "1.25rem" }}>
          <Stat label="مستخدمون جدد" value={totalUsers} color="#681F00" />
          <Stat label="أماكن جديدة" value={totalPlaces} color="#10b981" />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={series} margin={{ top: 5, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#681F00" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#681F00" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="placesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              fontSize: 12,
            }}
            labelStyle={{ fontWeight: 700, color: "var(--color-text-primary)" }}
            formatter={(value, key) => [
              String(value ?? 0),
              key === "users" ? "مستخدمون" : "أماكن",
            ]}
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
            formatter={(v) => (v === "users" ? "مستخدمون" : "أماكن")}
          />
          <Area
            type="monotone"
            dataKey="users"
            stroke="#681F00"
            strokeWidth={2}
            fill="url(#usersFill)"
          />
          <Area
            type="monotone"
            dataKey="places"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#placesFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <span
        style={{
          fontSize: "0.7rem",
          color: "var(--color-text-tertiary)",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "1.2rem", fontWeight: 800, color }}>+{value}</span>
    </div>
  );
}
