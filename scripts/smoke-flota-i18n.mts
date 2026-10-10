// smoke:flota-i18n — chei complete în ro/en/pl, placeholder-e identice, fără text hardcodat în /flota.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CATALOGS, fmtNum, fmtMoney } from "../src/lib/flota/i18n";
let fail = 0;
const keys = Object.keys(CATALOGS.ro);
for (const loc of ["en", "pl"] as const) {
  const k = Object.keys(CATALOGS[loc]);
  const missing = keys.filter((x) => !k.includes(x)), extra = k.filter((x) => !keys.includes(x));
  if (missing.length || extra.length) { console.log(`FAIL ${loc}: lipsă ${missing.join(",")} în plus ${extra.join(",")}`); fail++; }
  for (const key of keys) {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    if (ph(CATALOGS.ro[key as keyof typeof CATALOGS.ro]) !== ph(CATALOGS[loc][key as keyof typeof CATALOGS.ro])) { console.log(`FAIL ${loc} ${key}: placeholder-e diferite`); fail++; }
    if (!CATALOGS[loc][key as keyof typeof CATALOGS.ro].trim()) { console.log(`FAIL ${loc} ${key} gol`); fail++; }
  }
}
console.log(`${fail ? "FAIL" : "PASS"} ${keys.length} chei × 3 limbi`);
// toate cheile folosite în cod există
const files: string[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && files.push(p); } };
["src/app/flota", "src/components/flota", "src/lib/flota"].forEach(walk);
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/\bt\(\s*\w+,\s*"([\w.-]+)"/g)) if (!keys.includes(m[1])) { console.log(`FAIL cheie inexistentă ${m[1]} în ${f}`); fail++; }
}
// formatare
const checks: [string, string][] = [[fmtNum("ro", 56.6, 1), "56,6"], [fmtNum("pl", 56.6, 1), "56,6"], [fmtNum("en", 56.6, 1), "56.6"], [fmtNum("ro", 29248), "29.248"], [fmtNum("en", 29248), "29,248"], [fmtMoney("ro", 1234), "1.234 lei"]];
for (const [a, b] of checks) if (a !== b) { console.log(`FAIL format ${a} ≠ ${b}`); fail++; }
console.log(`${fail ? "FAIL" : "PASS"} formatare și chei folosite (${files.length} fișiere)`);
if (fail) process.exit(1);
console.log("smoke:flota-i18n OK");
