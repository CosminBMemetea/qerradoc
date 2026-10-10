import { notFound } from "next/navigation";
import { Card, Kpi, AlertCard, PageHead, Badge } from "@/components/flota/ui";
import MapReplay from "@/components/flota/MapReplay";
import { ConsumptionChart, LevelChart } from "@/components/flota/Charts";
import { CONSUMPTION_THRESHOLD, DEMO_NOW_MIN, STATION_MAX_KM, haversineKm, minToHHMM, positionAt } from "@/lib/flota/data";
import { avgL100, computeAlerts, fillsFor, intervals } from "@/lib/flota/rules";
import { fleetData } from "@/lib/flota/repo";
import { fmtDate, fmtMoney, fmtNum, t } from "@/lib/flota/i18n";
import { getLocale } from "@/lib/flota/i18n/server";

export const dynamic = "force-dynamic";

export default async function TruckPage({ params }: { params: { id: string } }) {
  const loc = getLocale();
  const d = await fleetData();
  const tr = d.trucks.find((x) => x.id === params.id);
  if (!tr) notFound();
  const iv = intervals(d, tr);
  const avg = avgL100(d, tr);
  const fills = fillsFor(d, tr.id).slice().reverse();
  const alerts = computeAlerts(d).filter((a) => a.truckId === tr.id);
  const p = positionAt(tr, DEMO_NOW_MIN);
  const lv = d.levels[tr.id];
  const l100ByFill = new Map(iv.map((i) => [i.to.id, i.l100]));
  const thr = Math.round(tr.normalL100 * (1 + CONSUMPTION_THRESHOLD) * 10) / 10;
  return (
    <div className="space-y-5">
      <PageHead title={tr.plate} subtitle={t(loc, "truck.meta", { model: tr.model, driver: tr.driver.split(" ")[0], tank: tr.tankL, route: tr.routeName })} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label={t(loc, "truck.now")} value={t(loc, `status.${p.status}`)} sub={t(loc, "dash.near", { place: p.place })} />
        <Kpi label={t(loc, "truck.avg30")} value={`${fmtNum(loc, avg, 1)}`} sub={`${t(loc, "ui.l100")} · ${t(loc, "truck.normal", { v: fmtNum(loc, tr.normalL100, 1) })}`} tone={avg > thr ? "red" : "default"} />
        <Kpi label={t(loc, "truck.fills30")} value={String(fills.length)} sub={`${fmtNum(loc, fills.reduce((s, f) => s + f.litres, 0))} ${t(loc, "ui.liters")}`} />
        <Kpi label={t(loc, "truck.alerts")} value={String(alerts.length)} tone={alerts.length ? "red" : "green"} />
      </div>
      {alerts.length > 0 && <Card title={t(loc, "truck.alerts")}><div className="space-y-2.5">{alerts.map((a) => <AlertCard key={a.id} a={a} loc={loc} showTruck={false} />)}</div></Card>}
      <Card title={t(loc, "truck.chart")}>
        <ConsumptionChart data={iv.map((i) => ({ label: fmtDate(loc, i.to.time.slice(0, 10)), l100: i.l100 }))} normal={tr.normalL100} threshold={thr} avg={avg}
          labels={{ normal: t(loc, "truck.normal", { v: fmtNum(loc, tr.normalL100, 1) }), threshold: t(loc, "truck.threshold", { v: fmtNum(loc, thr, 1) }), unit: t(loc, "ui.l100") }} />
      </Card>
      {lv && (
        <Card title={<>{t(loc, "truck.level")} <Badge className="ml-1 bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900">{t(loc, "truck.levelBadge")}</Badge></>}>
          <p className="text-xs text-slate-500 -mt-2 mb-2">{t(loc, "truck.levelNote")}</p>
          <LevelChart data={lv.map((x) => ({ h: minToHHMM(x.min), l: x.levelL }))} tank={tr.tankL} />
        </Card>
      )}
      <Card title={t(loc, "truck.position")}><MapReplay locale={loc} onlyId={tr.id} height={300} /></Card>
      <Card title={t(loc, "truck.fills")} className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200 dark:border-slate-800"><th className="py-2">{t(loc, "col.date")}</th><th>{t(loc, "col.station")}</th><th className="text-right">{t(loc, "col.litres")}</th><th className="text-right">{t(loc, "col.price")}</th><th className="text-right">{t(loc, "col.odo")}</th><th className="text-right">{t(loc, "col.l100")}</th><th className="text-right">{t(loc, "col.gps")}</th></tr></thead>
          <tbody>
            {fills.map((f) => { const dist = haversineKm(f.gpsAt, f.stationAt); const l = l100ByFill.get(f.id); const bad = dist > STATION_MAX_KM || f.litres > tr.tankL; return (
              <tr key={f.id} className={`border-b border-slate-100 dark:border-slate-800/60 ${bad ? "bg-rose-50 dark:bg-rose-950/40" : ""}`}>
                <td className="py-2 tabular-nums">{fmtDate(loc, f.time)}</td><td>{f.station}</td>
                <td className={`text-right tabular-nums ${f.litres > tr.tankL ? "text-rose-600 font-bold" : ""}`}>{fmtNum(loc, f.litres)}</td>
                <td className="text-right tabular-nums">{fmtMoney(loc, f.priceLei)}</td><td className="text-right tabular-nums">{fmtNum(loc, f.odometerKm)}</td>
                <td className={`text-right tabular-nums ${l && l > thr ? "text-rose-600 font-bold" : ""}`}>{l ? fmtNum(loc, l, 1) : "—"}</td>
                <td className={`text-right tabular-nums ${dist > STATION_MAX_KM ? "text-rose-600 font-bold" : ""}`}>{dist < 1 ? "<1 km" : `${fmtNum(loc, dist)} km`}</td>
              </tr>); })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
