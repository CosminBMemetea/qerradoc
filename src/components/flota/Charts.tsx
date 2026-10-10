"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, AreaChart, Area } from "recharts";

const tip = { contentStyle: { borderRadius: 12, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,.15)" } };
export function ConsumptionChart({ data, normal, threshold, avg, labels }: { data: { label: string; l100: number }[]; normal: number; threshold: number; avg: number; labels: { normal: string; threshold: string; unit: string } }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} domain={["dataMin - 3", "dataMax + 3"]} />
        <Tooltip {...tip} formatter={(v) => [`${v} ${labels.unit}`, ""]} />
        <ReferenceLine y={normal} stroke="#10b981" strokeDasharray="4 4" label={{ value: labels.normal, fontSize: 10, fill: "#10b981", position: "insideBottomLeft" }} />
        <ReferenceLine y={threshold} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: labels.threshold, fontSize: 10, fill: "#f43f5e", position: "insideTopLeft" }} />
        <ReferenceLine y={avg} stroke="#3b82f6" strokeOpacity={0.35} />
        <Line type="monotone" dataKey="l100" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
export function LevelChart({ data, tank }: { data: { h: string; l: number }[]; tank: number }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
        <XAxis dataKey="h" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={11} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} domain={[0, tank]} />
        <Tooltip {...tip} formatter={(v) => [`${v} L`, ""]} />
        <Area type="stepAfter" dataKey="l" stroke="#f59e0b" fill="#fde68a" fillOpacity={0.6} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
