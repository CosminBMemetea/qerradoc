import { Card, AlertItem } from "@/components/flota/ui";
import { RULE_LABEL, type RuleId } from "@/lib/flota/rules";
import { alerts as loadAlerts } from "@/lib/flota/repo";

export const dynamic = "force-dynamic";

export default async function Alerte() {
  const alerts = await loadAlerts();
  const rules = Object.keys(RULE_LABEL) as RuleId[];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Alerte ({alerts.length})</h1>
      <Card>
        <h2 className="font-bold mb-2">Regulile de detecție</h2>
        <ul className="text-sm text-slate-700 list-disc pl-5 space-y-1">
          <li><b>Km de pe bon ≠ GPS:</b> km declarați la pompă diferă cu peste 20% de km parcurși după GPS de la alimentarea anterioară.</li>
          <li><b>Card fără camion:</b> la ora tranzacției, GPS-ul camionului e la peste 5 km de stație.</li>
          <li><b>Scădere în rezervor, parcat:</b> nivelul scade cu peste 25 L în 30 de minute, cu camionul oprit (senzor viitor, simulat aici).</li>
          <li><b>Peste capacitate:</b> se alimentează mai mulți litri decât încap în rezervor.</li>
          <li><b>Litri prea mulți pentru km:</b> litrii de pe bon raportați la km parcurși de la alimentarea anterioară dau cu peste 25% peste media de 30 de zile a camionului.</li>
          <li><b>Consum peste normal:</b> peste 15% față de normalul camionului; avertizare, nu neapărat furt.</li>
        </ul>
      </Card>
      {rules.map((r) => {
        const list = alerts.filter((a) => a.rule === r);
        if (!list.length) return null;
        return (
          <Card key={r}>
            <h2 className="font-bold">{RULE_LABEL[r]} ({list.length})</h2>
            <ul>{list.map((a) => <AlertItem key={a.id} a={a} />)}</ul>
          </Card>
        );
      })}
    </div>
  );
}
