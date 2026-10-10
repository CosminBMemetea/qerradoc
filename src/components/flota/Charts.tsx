"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, AreaChart, Area } from "recharts";

export function ConsumptionChart({ data, normal, threshold, avg }: { data: { label: string; l100: number }[]; normal: number; threshold: number; avg: number }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} domain={["dataMin - 3", "dataMax + 3"]} />
        <Tooltip formatter={(v) => [`${v} L/100km`, "consum"]} />
        <ReferenceLine y={normal} stroke="#059669" strokeDasharray="4 4" label={{ value: `normal ${normal}`, fontSize: 10, position: "insideBottomLeft" }} />
        <ReferenceLine y={threshold} stroke="#dc2626" strokeDasharray="4 4" label={{ value: `prag alertă ${threshold}`, fontSize: 10, position: "insideTopLeft" }} />
        <ReferenceLine y={avg} stroke="#1e3a8a" strokeOpacity={0.4} />
        <Line type="monotone" dataKey="l100" stroke="#1e3a8a" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
export function LevelChart({ data, tank }: { data: { ora: string; litri: number }[]; tank: number }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="ora" tick={{ fontSize: 11 }} interval={11} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, tank]} />
        <Tooltip formatter={(v) => [`${v} L`, "nivel"]} />
        <Area type="stepAfter" dataKey="litri" stroke="#d97706" fill="#fde68a" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
