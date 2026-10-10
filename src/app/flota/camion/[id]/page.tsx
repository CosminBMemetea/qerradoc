import { notFound } from "next/navigation";
import { Card, Kpi, AlertItem, lei, num } from "@/components/flota/ui";
import MapReplay from "@/components/flota/MapReplay";
import { ConsumptionChart, LevelChart } from "@/components/flota/Charts";
import { CONSUMPTION_THRESHOLD, DEMO_NOW_MIN, STATION_MAX_KM, haversineKm, minToHHMM, positionAt } from "@/lib/flota/data";
import { avgL100, computeAlerts, fillsFor, fmt, intervals } from "@/lib/flota/rules";
import { fleetData } from "@/lib/flota/repo";

export const dynamic = "force-dynamic";

export default async function TruckPage({ params }: { params: { id: string } }) {
  const d = await fleetData();
  const t = d.trucks.find((x) => x.id === params.id);
  if (!t) notFound();
  const iv = intervals(d, t);
  const avg = avgL100(d, t);
  const fills = fillsFor(d, t.id).slice().reverse();
  const alerts = computeAlerts(d).filter((a) => a.truckId === t.id);
  const p = positionAt(t, DEMO_NOW_MIN);
  const lv = d.levels[t.id];
  const l100ByFill = new Map(iv.map((i) => [i.to.id, i.l100]));
  const thr = Math.round(t.normalL100 * (1 + CONSUMPTION_THRESHOLD) * 10) / 10;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t.plate}</h1>
        <p className="text-sm text-slate-500">{t.model} · șofer {t.driver} · rezervor {t.tankL} L · traseu {t.routeName}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Acum" value={p.status} sub={`lângă ${p.place}`} />
        <Kpi label="Consum 30 zile" value={`${num(avg, 1)} L/100km`} sub={`normal ${t.normalL100}`} tone={avg > thr ? "red" : undefined} />
        <Kpi label="Alimentări 30 zile" value={String(fills.length)} sub={`${num(fills.reduce((s, f) => s + f.litres, 0))} L`} />
        <Kpi label="Alerte" value={String(alerts.length)} tone={alerts.length ? "red" : "green"} />
      </div>
      {alerts.length > 0 && <Card><h2 className="font-bold">Alerte</h2><ul>{alerts.map((a) => <AlertItem key={a.id} a={a} showTruck={false} />)}</ul></Card>}
      <Card>
        <h2 className="font-bold mb-2">Consum pe interval între alimentări (L/100km)</h2>
        <ConsumptionChart data={iv.map((i) => ({ label: fmt(i.to.time).slice(0, 5), l100: i.l100 }))} normal={t.normalL100} threshold={thr} avg={avg} />
      </Card>
      {lv && (
        <Card>
          <h2 className="font-bold">Nivel rezervor azi <span className="text-xs font-semibold bg-amber-100 text-amber-900 rounded px-1.5 py-0.5 ml-1">senzor viitor — simulat</span></h2>
          <p className="text-xs text-slate-500 mb-2">Ar veni dintr-o sondă capacitivă sau din magistrala CAN (FMS).</p>
          <LevelChart data={lv.map((x) => ({ ora: minToHHMM(x.min), litri: x.levelL }))} tank={t.tankL} />
        </Card>
      )}
      <Card>
        <h2 className="font-bold mb-2">Poziție azi</h2>
        <MapReplay onlyId={t.id} height={300} />
      </Card>
      <Card className="overflow-x-auto">
        <h2 className="font-bold mb-2">Alimentări (card carburant)</h2>
        <table className="w-full text-sm min-w-[640px]">
          <thead><tr className="text-left text-slate-500 border-b"><th className="py-1.5">Data</th><th>Stație</th><th className="text-right">Litri</th><th className="text-right">Preț</th><th className="text-right">Km bord</th><th className="text-right">L/100km</th><th className="text-right">GPS↔stație</th></tr></thead>
          <tbody>
            {fills.map((f) => { const d = haversineKm(f.gpsAt, f.stationAt); const l = l100ByFill.get(f.id); return (
              <tr key={f.id} className={`border-b border-slate-100 ${d > STATION_MAX_KM || f.litres > t.tankL ? "bg-red-50" : ""}`}>
                <td className="py-1.5">{fmt(f.time)}</td><td>{f.station}</td>
                <td className={`text-right ${f.litres > t.tankL ? "text-red-700 font-bold" : ""}`}>{f.litres}</td>
                <td className="text-right">{lei(f.priceLei)}</td><td className="text-right">{num(f.odometerKm)}</td>
                <td className={`text-right ${l && l > thr ? "text-red-700 font-bold" : ""}`}>{l ?? "—"}</td>
                <td className={`text-right ${d > STATION_MAX_KM ? "text-red-700 font-bold" : ""}`}>{d < 1 ? "<1 km" : `${Math.round(d)} km`}</td>
              </tr>); })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
