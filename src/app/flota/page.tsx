import Link from "next/link";
import { Card, Kpi, AlertCard, PageHead, Empty } from "@/components/flota/ui";
import AskPanel from "@/components/flota/AskPanel";
import { DEMO_NOW_MIN, positionAt } from "@/lib/flota/data";
import { avgL100, computeAlerts } from "@/lib/flota/rules";
import { fleetData } from "@/lib/flota/repo";
import { fleetTotals, movingNow, NOW_LABEL } from "@/lib/flota/query";
import { fmtDate, fmtMoney, fmtNum, fmtPct, t } from "@/lib/flota/i18n";
import { getLocale } from "@/lib/flota/i18n/server";
import { STATUS_COLOR } from "@/components/flota/colors";

export const dynamic = "force-dynamic";

export default async function FlotaDashboard() {
  const loc = getLocale();
  const d = await fleetData();
  const month = fleetTotals(d, "month");
  const fleet30 = fleetTotals(d, "30d");
  const alerts = computeAlerts(d);
  const moving = movingNow(d).length;
  const ranking = d.trucks.map((tr) => ({ tr, avg: avgL100(d, tr), over: avgL100(d, tr) / tr.normalL100 - 1 })).sort((a, b) => b.over - a.over);
  const maxOver = Math.max(...ranking.map((r) => Math.abs(r.over)), 0.05);
  return (
    <div className="space-y-5">
      <PageHead title={t(loc, "dash.title")} subtitle={t(loc, "dash.subtitle", { n: d.trucks.length, now: fmtDate(loc, NOW_LABEL, true) })} />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon="⛽" label={t(loc, "kpi.litres")} value={`${fmtNum(loc, month.litres)} ${t(loc, "ui.liters")}`} sub={t(loc, "kpi.litresSub")} />
        <Kpi icon="💶" label={t(loc, "kpi.cost")} value={fmtMoney(loc, month.cost)} sub={t(loc, "kpi.costSub")} />
        <Kpi icon="📈" label={t(loc, "kpi.avg")} value={`${fmtNum(loc, fleet30.avgL100, 1)} ${t(loc, "ui.l100")}`} sub={t(loc, "kpi.avgSub")} />
        <Kpi icon="🚨" label={t(loc, "kpi.alerts")} value={String(alerts.length)} sub={t(loc, "kpi.alertsSub", { n: alerts.filter((a) => a.theft).length })} tone="red" />
        <Kpi icon="🚚" label={t(loc, "kpi.moving")} value={`${moving} / ${d.trucks.length}`} tone="green" />
      </div>
      <AskPanel locale={loc} />
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2" title={t(loc, "dash.alerts")} action={<Link href="/flota/alerte" className="text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline">{t(loc, "ui.all")} →</Link>}>
          {alerts.length ? <div className="space-y-2.5">{alerts.slice(0, 4).map((a) => <AlertCard key={a.id} a={a} loc={loc} />)}</div> : <Empty text={t(loc, "ui.empty")} />}
        </Card>
        <Card title={t(loc, "dash.ranking")}>
          <p className="text-xs text-slate-500 -mt-2 mb-3">{t(loc, "dash.rankingSub")}</p>
          <ol className="space-y-2.5">
            {ranking.map(({ tr, avg, over }, i) => (
              <li key={tr.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-4 text-slate-400 tabular-nums">{i + 1}</span>
                  <Link href={`/flota/camion/${tr.id}`} className="font-semibold text-blue-700 dark:text-blue-400 hover:underline">{tr.plate}</Link>
                  <span className="ml-auto tabular-nums text-slate-600 dark:text-slate-300">{fmtNum(loc, avg, 1)}</span>
                  <span className={`w-12 text-right font-semibold tabular-nums ${over > 0.03 ? "text-rose-600" : "text-emerald-600"}`}>{fmtPct(loc, over)}</span>
                </div>
                <div className="ml-6 mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className={`h-full rounded-full ${over > 0.03 ? "bg-rose-400" : "bg-emerald-400"}`} style={{ width: `${Math.max(4, (Math.abs(over) / maxOver) * 100)}%` }} /></div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
      <Card title={t(loc, "dash.trucks")}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {d.trucks.map((tr) => {
            const p = positionAt(tr, DEMO_NOW_MIN);
            const n = alerts.filter((a) => a.truckId === tr.id).length;
            return (
              <Link key={tr.id} href={`/flota/camion/${tr.id}`} className="group rounded-xl ring-1 ring-slate-200 dark:ring-slate-800 p-3 hover:ring-blue-400 hover:shadow-md transition bg-white dark:bg-slate-900">
                <div className="flex justify-between items-start"><b className="tracking-wide">{tr.plate}</b>{n > 0 && <span className="text-[11px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded-full px-2 py-0.5">{t(loc, "dash.alertCount", { n })}</span>}</div>
                <div className="text-xs text-slate-500 mt-0.5">{tr.model} · {tr.driver.split(" ")[0]}</div>
                <div className="text-sm mt-2 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[p.status] }} />{t(loc, `status.${p.status}`)} · <span className="text-slate-500">{t(loc, "dash.near", { place: p.place })}</span></div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
