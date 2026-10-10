import { Card, AlertCard, PageHead } from "@/components/flota/ui";
import { RULES, ruleTitle, KM_MISMATCH } from "@/lib/flota/rules";
import { alerts as loadAlerts } from "@/lib/flota/repo";
import { CONSUMPTION_THRESHOLD, PARKED_DROP_L, STATION_MAX_KM, THEFT_AVG_THRESHOLD } from "@/lib/flota/data";
import { t, type MsgKey } from "@/lib/flota/i18n";
import { getLocale } from "@/lib/flota/i18n/server";

export const dynamic = "force-dynamic";
const DESC_VARS = { "km-nepotrivit": { pct: KM_MISMATCH * 100 }, "card-fara-camion": { km: STATION_MAX_KM }, "scadere-parcat": { litres: PARKED_DROP_L }, "peste-capacitate": {}, "consum-peste-medie": { pct: THEFT_AVG_THRESHOLD * 100 }, "consum-peste-normal": { pct: CONSUMPTION_THRESHOLD * 100 } } as const;

export default async function Alerte() {
  const loc = getLocale();
  const alerts = await loadAlerts();
  return (
    <div className="space-y-5">
      <PageHead title={t(loc, "alerts.title", { n: alerts.length })} />
      <Card title={t(loc, "alerts.rules")}>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          {RULES.map((r) => <li key={r} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3"><b>{ruleTitle(loc, r)}</b><br /><span className="text-slate-600 dark:text-slate-300">{t(loc, `ruledesc.${r}` as MsgKey, DESC_VARS[r])}</span></li>)}
        </ul>
      </Card>
      {RULES.map((r) => {
        const list = alerts.filter((a) => a.rule === r);
        return list.length ? (
          <Card key={r} title={`${ruleTitle(loc, r)} (${list.length})`}>
            <div className="space-y-2.5">{list.map((a) => <AlertCard key={a.id} a={a} loc={loc} />)}</div>
          </Card>
        ) : null;
      })}
    </div>
  );
}
