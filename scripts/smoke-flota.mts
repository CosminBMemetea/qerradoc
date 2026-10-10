// smoke:flota — fiecare regulă de furt trebuie să se declanșeze pe datele demo, plus cazuri normale.
import { computeAlerts, whyText } from "../src/lib/flota/rules";
import { TRUCKS } from "../src/lib/flota/data";
import { fleetData, alerts as serverAlerts } from "../src/lib/flota/repo";
const d = await fleetData();
const alerts = computeAlerts(d);
if (JSON.stringify(await serverAlerts()) !== JSON.stringify(alerts)) { console.error("FAIL repo/alerts"); process.exit(1); }
const need: [string, string][] = [["km-nepotrivit", "cj08qrt"], ["card-fara-camion", "tm33qrt"], ["scadere-parcat", "ar45qrt"], ["peste-capacitate", "b120qrt"], ["consum-peste-medie", "cj52qrt"], ["consum-peste-normal", "cj08qrt"]];
let fail = 0;
for (const [rule, truck] of need) {
  const hit = alerts.filter((a) => a.rule === rule && a.truckId === truck);
  console.log(`${hit.length ? "PASS" : "FAIL"} ${rule} pe ${truck} (${hit.length})`);
  if (!hit.length) fail++;
  if (hit.some((a) => ["ro", "en", "pl"].some((l) => whyText(l as "ro", a).length < 40 || /\{\w+\}/.test(whyText(l as "ro", a))))) { console.log(`FAIL ${rule}: lipsește explicația`); fail++; }
}
const clean = TRUCKS.filter((t) => !alerts.some((a) => a.truckId === t.id));
console.log(`${clean.length >= 3 ? "PASS" : "FAIL"} camioane fără alerte: ${clean.map((t) => t.plate).join(", ")}`);
if (clean.length < 3) fail++;
const theftOnNormal = alerts.filter((a) => a.theft && clean.some((t) => t.id === a.truckId));
if (theftOnNormal.length) fail++;
const again = JSON.stringify(computeAlerts(d));
console.log(`${again === JSON.stringify(alerts) ? "PASS" : "FAIL"} determinist`);
if (again !== JSON.stringify(alerts)) fail++;
if (fail) { console.error(`smoke:flota: ${fail} eșec(uri)`); process.exit(1); }
console.log("smoke:flota OK");
