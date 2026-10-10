// smoke:flota-ask — răspunsurile fără AI (reguli) pentru întrebări uzuale în ro/en/pl.
import { render, ruleIntent, detectLocale, parseToolCall } from "../src/lib/flota/ask";
import { fleetData } from "../src/lib/flota/repo";
const d = await fleetData();
const cases: [string, string, RegExp][] = [
  ["cine a consumat cel mai mult luna asta?", "top_consumers", /L\/100km/],
  ["Who used the most fuel this month?", "top_consumers", /L\/100km/],
  ["Kto spalił najwięcej w tym miesiącu?", "top_consumers", /l\/100 km/],
  ["Ce alerte de furt am săptămâna asta?", "alerts", /Alerte între/],
  ["Which theft alerts do I have this week?", "alerts", /Alerts between/],
  ["Cât costă pe km camionul B 120 QRT?", "cost_per_km", /B 120 QRT: .* lei/],
  ["Where did TM 33 QRT refuel?", "fills", /TM 33 QRT at/],
  ["Gdzie tankowała TM 33 QRT?", "fills", /TM 33 QRT na/],
  ["Câtă motorină am băgat luna asta?", "fleet_totals", /\d+\.\d{3} L/],
  ["Care camioane sunt în mers acum?", "moving_now", /în mers acum/],
  ["CJ 52 QRT", "truck_summary", /CJ 52 QRT \(Renault/],
];
let fail = 0;
for (const [q, tool, re] of cases) {
  const call = ruleIntent(q);
  const a = render(detectLocale(q, "ro"), d, call, "rules");
  const ok = call?.tool === tool && re.test(a.text) && !/\{\w+\}/.test(a.text);
  console.log(`${ok ? "PASS" : "FAIL"} [${call?.tool}] ${q} → ${a.text.slice(0, 110)}`);
  if (!ok) fail++;
}
const unk = render("ro", d, ruleIntent("care e vremea mâine?"), "rules");
if (unk.tool !== null) { console.log("FAIL întrebare necunoscută"); fail++; }
if (parseToolCall("rm_rf", "{}") !== null || parseToolCall("alerts", '{"period":"evil"}')?.args.period !== undefined) { console.log("FAIL validare tool"); fail++; }
if (fail) process.exit(1);
console.log("smoke:flota-ask OK");
