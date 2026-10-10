import Link from "next/link";
import type { Alert, Severity } from "@/lib/flota/rules";
import { fmt } from "@/lib/flota/rules";
import { truckById } from "@/lib/flota/data";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 ${className}`}>{children}</section>;
}
export function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "red" | "green" }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-600" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </Card>
  );
}
const SEV: Record<Severity, string> = { ridicată: "bg-red-100 text-red-800 border-red-200", medie: "bg-amber-100 text-amber-900 border-amber-200", scăzută: "bg-slate-100 text-slate-700 border-slate-200" };
export function SevBadge({ s }: { s: Severity }) {
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${SEV[s]}`}>{s}</span>;
}
export function AlertItem({ a, showTruck = true }: { a: Alert; showTruck?: boolean }) {
  const t = truckById(a.truckId)!;
  return (
    <li className="py-3 border-b border-slate-100 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <SevBadge s={a.severity} />
        {a.theft && <span className="text-xs font-semibold text-red-700">suspiciune furt</span>}
        <span className="font-semibold">{a.title}</span>
        {showTruck && <Link href={`/flota/camion/${t.id}`} className="text-blue-700 underline text-sm">{t.plate}</Link>}
        <span className="text-xs text-slate-500 ml-auto">{fmt(a.time)}</span>
      </div>
      <p className="text-sm text-slate-700 mt-1"><b>De ce:</b> {a.why}</p>
    </li>
  );
}
// Formatare manuală (nu Intl) ca serverul și browserul să dea exact același text.
export function num(n: number, d = 0): string {
  const [i, f] = Math.abs(n).toFixed(d).split(".");
  return (n < 0 ? "-" : "") + i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (f ? "," + f : "");
}
export const lei = (n: number) => num(n) + " lei";
