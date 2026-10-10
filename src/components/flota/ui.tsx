import Link from "next/link";
import type { Alert, Severity } from "@/lib/flota/rules";
import { ruleTitle, whyText } from "@/lib/flota/rules";
import { fmtDate, t, type Locale } from "@/lib/flota/i18n";
import { truckById } from "@/lib/flota/data";

export function Card({ children, className = "", title, action }: { children: React.ReactNode; className?: string; title?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className={`flota-in rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200/80 dark:ring-slate-800 shadow-sm p-4 sm:p-5 ${className}`}>
      {(title || action) && <div className="flex items-center justify-between gap-3 mb-3"><h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}
export function PageHead({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flota-in flex flex-wrap items-end justify-between gap-3 mb-5">
      <div><h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>{subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}</div>
      {right}
    </div>
  );
}
const TONE = { red: "text-rose-600 dark:text-rose-400", green: "text-emerald-600 dark:text-emerald-400", default: "text-slate-900 dark:text-white" };
export function Kpi({ label, value, sub, tone = "default", icon }: { label: string; value: string; sub?: string; tone?: keyof typeof TONE; icon?: string }) {
  return (
    <div className="flota-in rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200/80 dark:ring-slate-800 shadow-sm p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{icon && <span aria-hidden>{icon}</span>}{label}</div>
      <div className={`text-2xl font-bold mt-1.5 tabular-nums ${TONE[tone]}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}
const SEV: Record<Severity, string> = {
  high: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-900",
  medium: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900",
  low: "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
};
const SEV_BAR: Record<Severity, string> = { high: "bg-rose-500", medium: "bg-amber-400", low: "bg-slate-300" };
export function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ${className}`}>{children}</span>;
}
export function SevBadge({ s, loc }: { s: Severity; loc: Locale }) {
  return <Badge className={SEV[s]}>{t(loc, `sev.${s}`)}</Badge>;
}
export function AlertCard({ a, loc, showTruck = true }: { a: Alert; loc: Locale; showTruck?: boolean }) {
  const tr = truckById(a.truckId);
  return (
    <article className="relative overflow-hidden rounded-xl bg-slate-50/70 dark:bg-slate-800/50 ring-1 ring-slate-200/70 dark:ring-slate-700/60 p-3 pl-4">
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${SEV_BAR[a.severity]}`} />
      <div className="flex flex-wrap items-center gap-2">
        <SevBadge s={a.severity} loc={loc} />
        {a.theft && <Badge className="bg-rose-600 text-white ring-rose-600">{t(loc, "alert.theft")}</Badge>}
        {showTruck && tr && <Link href={`/flota/camion/${tr.id}`} className="text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline">{tr.plate}</Link>}
        <span className="ml-auto text-xs text-slate-500 tabular-nums">{fmtDate(loc, a.time)}</span>
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-1.5">{ruleTitle(loc, a.rule)}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed"><span className="font-semibold text-slate-800 dark:text-slate-200">{t(loc, "alert.why")}:</span> {whyText(loc, a)}</p>
    </article>
  );
}
export function Empty({ text }: { text: string }) {
  return <div className="text-center text-sm text-slate-500 py-8"><div className="text-3xl mb-2" aria-hidden>🛣️</div>{text}</div>;
}
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`flota-skel rounded-xl ${className}`} />;
}
export const btn = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none";
export const btnPrimary = `${btn} bg-blue-700 text-white hover:bg-blue-800 shadow-sm`;
export const btnGhost = `${btn} ring-1 ring-slate-300 dark:ring-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800`;
export const input = "w-full rounded-xl bg-white dark:bg-slate-950 ring-1 ring-slate-300 dark:ring-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600";
