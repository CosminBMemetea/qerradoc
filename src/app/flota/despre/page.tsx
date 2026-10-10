import { Card } from "@/components/flota/ui";

const ROWS = [
  ["Poziția camioanelor (hartă)", "Simulată: trasee între orașe, viteză medie 68 km/h", "GPS-ul existent al firmei prin API (Wialon, Webfleet, Geotab, SafeFleet, TrackGPS etc.) sau aplicația pe telefonul șoferului"],
  ["Alimentări (stație, litri, preț, km)", "Simulate, 30 de zile, generate determinist", "Export CSV sau API de la cardul de carburant (DKV, OMV/Routex, MOL, Shell, E100, Eurowag)"],
  ["Consum L/100km", "Calculat din alimentările simulate (plin-la-plin)", "Același calcul, pe datele reale; ideal verificat cu kilometrajul din GPS/CAN"],
  ["Nivel în rezervor", "Simulat pe 2 camioane, marcat „senzor viitor”", "Sondă montată de partenerul de monitorizare GPS (de ex. Omnicomm, Escort), citită prin API-ul lui"],
  ["Alerte", "Calculate pe server din datele de mai sus", "Aceleași reguli, pe baza de date Postgres, la fiecare tranzacție nouă"],
];

export default function Despre() {
  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold">De unde vin datele</h1>
      <Card>
        <p className="text-sm">Tot ce vezi în acest demo este <b>simulat</b>: camioane, șoferi, trasee, alimentări și carduri sunt inventate și generate de un algoritm fix, ca demo-ul să arate la fel de fiecare dată. Datele stau pe serverul demo (în memorie), iar alertele se calculează pe server și ajung în pagină prin API-ul <code>/api/flota/*</code>.</p>
      </Card>
      <Card>
        <h2 className="font-bold mb-2">Planuri</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-slate-200 p-3"><b>Start</b> — fără aparat montat
            <ul className="list-disc pl-5 mt-1 space-y-0.5"><li>Poziția din telefonul șoferului (<a className="text-blue-700 underline" href="/flota/sofer">/flota/sofer</a>), doar în program</li><li>Alimentări din bonuri sau introduse manual</li><li>L/100km, alimentări suspecte (km și loc vs bon), panou în română</li></ul></div>
          <div className="rounded-lg border border-slate-200 p-3"><b>Pro</b> — cu sistemele pe care le ai deja
            <ul className="list-disc pl-5 mt-1 space-y-0.5"><li>Integrare cu API-ul firmei tale de monitorizare GPS (doar citire)</li><li>Import CSV / API de la cardul de carburant</li><li>Aceleași alerte, cu poziție sigură de la aparatul montat</li></ul></div>
        </div>
        <p className="text-xs text-slate-500 mt-2">Querra face doar software-ul. Aparatele GPS și sondele de rezervor vin prin partenerii de monitorizare, nu de la noi. Telefonul nu prinde sifonarea din rezervor; pentru asta e nevoie de sondă.</p>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead><tr className="text-left text-slate-500 border-b"><th className="py-1.5 pr-2">Ce</th><th className="pr-2">În demo</th><th>Cu date reale</th></tr></thead>
          <tbody>{ROWS.map((r) => <tr key={r[0]} className="border-b border-slate-100 align-top"><td className="py-2 pr-2 font-semibold">{r[0]}</td><td className="pr-2">{r[1]}</td><td>{r[2]}</td></tr>)}</tbody>
        </table>
      </Card>
      <Card>
        <h2 className="font-bold mb-2">Ce ne trebuie pentru un pilot cu date reale</h2>
        <ol className="list-decimal pl-5 text-sm space-y-1">
          <li>Exportul CSV de la cardul de carburant pe ultimele 1–3 luni.</li>
          <li>Acces doar-citire la API-ul firmei de monitorizare GPS (sau exportul traseelor pe aceeași perioadă).</li>
          <li>Lista camioanelor: număr, model, capacitatea rezervorului, consumul normal.</li>
          <li>Informarea șoferilor: localizare doar în programul de lucru, conform GDPR și Legii 190/2018.</li>
        </ol>
      </Card>
      <Card>
        <h2 className="font-bold mb-2">Pragurile din demo</h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li>Card fără camion: GPS la peste 5 km de stație la ora tranzacției.</li>
          <li>Scădere în rezervor, parcat: peste 25 L în 30 de minute.</li>
          <li>Peste capacitate: litri alimentați &gt; capacitatea rezervorului.</li>
          <li>Km de pe bon ≠ GPS: diferență peste 20% față de km parcurși după GPS.</li>
          <li>Litri prea mulți pentru km: +25% față de media camionului pe 30 de zile.</li>
          <li>Consum peste normal: +15% față de normalul camionului (avertizare).</li>
        </ul>
        <p className="text-xs text-slate-500 mt-2">Hărți: © colaboratorii OpenStreetMap.</p>
      </Card>
    </div>
  );
}
