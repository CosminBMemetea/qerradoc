import Link from "next/link";
import { Card, Kpi, AlertItem, lei, num } from "@/components/flota/ui";
import { DEMO_NOW_MIN, positionAt } from "@/lib/flota/data";
import { avgL100, computeAlerts, intervals } from "@/lib/flota/rules";
import { fleetData } from "@/lib/flota/repo";

export const dynamic = "force-dynamic";

export default async function FlotaDashboard() {
  const d = await fleetData();
  const { trucks: TRUCKS, fills: FILLS } = d;
  const month = FILLS.filter((f) => f.time.startsWith("2026-10"));
  const litres = month.reduce((s, f) => s + f.litres, 0);
  const cost = month.reduce((s, f) => s + f.priceLei, 0);
  const all = TRUCKS.flatMap((t) => intervals(d, t));
  const fleetAvg = all.reduce((s, i) => s + i.litres, 0) / all.reduce((s, i) => s + i.km, 0) * 100;
  const alerts = computeAlerts(d);
  const moving = TRUCKS.filter((t) => positionAt(t, DEMO_NOW_MIN).status === "în mers").length;
  const ranking = TRUCKS.map((t) => ({ t, avg: avgL100(d, t), over: avgL100(d, t) / t.normalL100 - 1 })).sort((a, b) => b.over - a.over);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Panou patron</h1>
        <p className="text-sm text-slate-500">Transport Demo SRL · 8 camioane · „acum” = 15 oct 2026, 14:00</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Motorină octombrie" value={`${num(litres)} L`} sub="1–15 oct" />
        <Kpi label="Cost octombrie" value={lei(cost)} sub="din cardurile de carburant" />
        <Kpi label="Consum mediu flotă" value={`${num(fleetAvg, 1)} L/100km`} sub="ultimele 30 de zile" />
        <Kpi label="Alerte deschise" value={String(alerts.length)} sub={`${alerts.filter((a) => a.theft).length} suspiciuni de furt`} tone="red" />
        <Kpi label="Camioane în mers" value={`${moving} / ${TRUCKS.length}`} tone="green" />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between"><h2 className="font-bold">Alerte</h2><Link href="/flota/alerte" className="text-sm text-blue-700 underline">Toate</Link></div>
          <ul>{alerts.slice(0, 5).map((a) => <AlertItem key={a.id} a={a} />)}</ul>
        </Card>
        <Card>
          <h2 className="font-bold mb-2">Cel mai mare consum</h2>
          <p className="text-xs text-slate-500 mb-2">media pe 30 de zile față de normalul fiecărui camion</p>
          <ol className="space-y-2">
            {ranking.map(({ t, avg, over }, i) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-slate-400">{i + 1}.</span>
                <Link href={`/flota/camion/${t.id}`} className="font-semibold text-blue-700 underline">{t.plate}</Link>
                <span className="ml-auto">{num(avg, 1)}</span>
                <span className={`w-14 text-right font-semibold ${over > 0.03 ? "text-red-600" : "text-emerald-600"}`}>{over >= 0 ? "+" : ""}{num(over * 100, 0)}%</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
      <Card>
        <h2 className="font-bold mb-3">Camioane</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TRUCKS.map((t) => {
            const p = positionAt(t, DEMO_NOW_MIN);
            const n = alerts.filter((a) => a.truckId === t.id).length;
            return (
              <Link key={t.id} href={`/flota/camion/${t.id}`} className="block rounded-lg border border-slate-200 p-3 hover:border-blue-400">
                <div className="flex justify-between"><b>{t.plate}</b>{n > 0 && <span className="text-xs bg-red-100 text-red-800 rounded-full px-2">{n} {n === 1 ? "alertă" : "alerte"}</span>}</div>
                <div className="text-xs text-slate-500">{t.model} · {t.driver}</div>
                <div className="text-sm mt-1">{p.status} · lângă {p.place}</div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
