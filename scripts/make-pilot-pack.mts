/**
 * Build a pilot pack (<slug>.querra.json) for a firm's first day.
 *
 *   npx tsx scripts/make-pilot-pack.mts \
 *     --firm "CleanTech Service SRL" --logo docs/pilot/example-logo.png \
 *     --excel docs/pilot/example-catalog.xlsx [--excel another.xlsx] \
 *     --tip "Revizie" --tech "Andrei Pop" --tech "Mihai Ionescu" \
 *     [--cui RO123] [--address "..."] [--phone "..."] [--locale ro] [--out docs/pilot]
 *
 * Output: same shape as backup v2 minus fișe, plus a `pack` marker. Catalog
 * Excel files are parsed with the in-app catalog importer (Clienti/Utilaje
 * sheets, CSV, or the classic RO fișă layout).
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parseCatalogWorkbook } from "../src/lib/catalog-parse.ts";
import { buildPilotPack, packFilename, validatePilotPack } from "../src/lib/pilot-pack.ts";
import { TIPURI, type CatalogClient, type CatalogEquipment, type ContentLocale, type TipFisa } from "../src/lib/types.ts";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx") as typeof import("xlsx");

const { values } = parseArgs({
  options: {
    firm: { type: "string" },
    logo: { type: "string" },
    excel: { type: "string", multiple: true },
    tip: { type: "string" },
    tech: { type: "string", multiple: true },
    cui: { type: "string" },
    address: { type: "string" },
    phone: { type: "string" },
    locale: { type: "string" },
    out: { type: "string" },
    date: { type: "string" },
  },
});

function fail(msg: string): never {
  console.error(`make-pilot-pack: ${msg}`);
  process.exit(1);
}

const firm = values.firm?.trim();
if (!firm) fail('--firm "Firm name" is required');

const TIP_ALIASES: Record<string, TipFisa> = {
  constatare: "Constatare", inspection: "Constatare", diagnosis: "Constatare",
  reparatie: "Reparație", "reparație": "Reparație", repair: "Reparație",
  revizie: "Revizie", service: "Revizie", maintenance: "Revizie",
  pif: "Punere în funcțiune", "punere in functiune": "Punere în funcțiune",
  "punere în funcțiune": "Punere în funcțiune", commissioning: "Punere în funcțiune",
};
let tip: TipFisa | undefined;
if (values.tip) {
  const k = values.tip.trim().toLowerCase();
  tip = (TIPURI as string[]).includes(values.tip.trim()) ? (values.tip.trim() as TipFisa) : TIP_ALIASES[k];
  if (!tip) fail(`unknown --tip "${values.tip}" (use one of: ${TIPURI.join(", ")})`);
}

const loc = values.locale?.toLowerCase();
if (loc && !["ro", "en", "pl"].includes(loc)) fail("--locale must be ro, en or pl");

let logoDataUrl: string | undefined;
if (values.logo) {
  const buf = readFileSync(values.logo);
  const ext = extname(values.logo).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "";
  if (!mime) fail("--logo must be .png, .jpg or .webp");
  if (buf.length > 400 * 1024) console.warn(`make-pilot-pack: warning — logo is ${(buf.length / 1024).toFixed(0)} KB; the app compresses logos on upload, consider a smaller file.`);
  logoDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
}

let clients: CatalogClient[] = [];
let equipment: CatalogEquipment[] = [];
for (const f of values.excel ?? []) {
  const wb = XLSX.read(readFileSync(f), { type: "buffer", codepage: 65001 });
  const r = parseCatalogWorkbook(wb, clients, equipment, "upsert");
  clients = r.clients.list;
  equipment = r.equipment.list;
  console.log(`  ${f}: +${r.clients.added} clients (${r.clients.updated} updated), +${r.equipment.added} equipment (${r.equipment.updated} updated)`);
}

const now = values.date ? new Date(values.date) : new Date();
// Stable ids/timestamps so the same inputs give the same pack.
clients = clients.map((c, i) => ({ ...c, id: `pack-c-${i + 1}`, updatedAt: now.toISOString() }));
equipment = equipment.map((e, i) => ({ ...e, id: `pack-e-${i + 1}`, updatedAt: now.toISOString() }));

const pack = buildPilotPack({
  firmName: firm,
  cui: values.cui,
  address: values.address,
  phone: values.phone,
  logoDataUrl,
  clients,
  equipment,
  defaultTip: tip,
  technicians: values.tech ?? [],
  contentLocale: loc as ContentLocale | undefined,
  now,
});
const check = validatePilotPack(JSON.parse(JSON.stringify(pack)));
if (!check.ok) fail(`generated pack failed validation: ${check.error}`);

const outDir = resolve(values.out ?? ".");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, packFilename(pack.pack.slug));
writeFileSync(outPath, JSON.stringify(pack, null, 2) + "\n");
console.log(`make-pilot-pack: wrote ${outPath}`);
console.log(`  firm: ${pack.settings.companyName}  logo: ${logoDataUrl ? "yes" : "no"}  tip: ${tip ?? "-"}  technicians: ${pack.settings.technicians?.join(", ") || "-"}`);
console.log(`  clients: ${clients.length}  equipment: ${equipment.length}`);
