/**
 * Smoke: filled client Excel (RO fișă layout) → draft Fisa, plus PDF render.
 * Run: npm run test:ro-fisa-draft
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  parseRoFisaWorkbook,
  readRoWorkbook,
  buildRoDraftFisa,
  roExtractFromDraft,
  parseRoNumber,
  parseRoDate,
} from "../src/lib/ro-fisa-draft";
import { resolveCurrency } from "../src/lib/currency";
import { upsertClientFromRo, upsertEquipmentFromRo } from "../src/lib/catalog-ro-fisa";
import { generateFisaPdf } from "../src/lib/pdf";
import { validateBackup, BACKUP_VERSION } from "../src/lib/backup";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx") as typeof import("xlsx");

function load(path: string) {
  return readRoWorkbook(readFileSync(path), path);
}

function checkHelpers() {
  assert.equal(parseRoNumber("345,50"), 345.5);
  assert.equal(parseRoNumber("1.250,00 lei"), 1250);
  assert.equal(parseRoNumber("1.250"), 1250);
  assert.equal(parseRoNumber("242.50"), 242.5);
  assert.equal(parseRoNumber("2 ore"), 2);
  assert.equal(parseRoNumber("35 km"), 35);
  assert.equal(parseRoNumber("abc"), null);
  assert.equal(parseRoDate("18.09.2026"), "2026-09-18");
  assert.equal(parseRoDate("5/3/26"), "2026-03-05");
  assert.equal(parseRoDate("2026-09-19"), "2026-09-19");
  assert.equal(parseRoDate(46284), "2026-09-19"); // Excel serial
  assert.equal(parseRoDate("Mihai Popa"), "");
}

function checkFilled() {
  const res = parseRoFisaWorkbook(load("docs/fixture-fisa-ro-filled.xlsx"));
  assert.ok(res.ok, "filled fixture must parse");
  if (!res.ok) throw new Error("unreachable");
  assert.equal(res.sheetName, "Fisa", "skips the leading non-fișă sheet");
  const f = res.fields;
  assert.equal(f.tip, "Reparație");
  assert.equal(f.nrFisa, "2026-0421");
  assert.equal(f.proprietar, "Continental Hotels SA");
  assert.equal(f.client, "Hotel Continental Oradea");
  assert.equal(f.locatie, "Str. Republicii 12, Oradea");
  assert.equal(f.modelUtilaj, "Nilfisk SC500");
  assert.equal(f.serie, "SN-998877");
  assert.equal(f.oreFunctionare, "1250");
  assert.equal(f.manoperaOre, "2");
  assert.equal(f.deplasareKm, "35");
  assert.equal(f.deplasareDaNu, "DA");
  assert.equal(f.reclamatie, "Nu aspiră apa, perie uzată");
  assert.equal(f.dataAnuntarii, "2026-09-18");
  assert.equal(f.dataInterventiei, "2026-09-19");
  assert.equal(
    f.observatii,
    "Înlocuit peria și filtrul HEPA. Test aspirare OK. Recomandat revizie la 1500 ore."
  );
  assert.equal(f.motiveInlocuire, "Perie uzată 60%, filtru HEPA colmatat.");
  assert.equal(f.semnaturaClient, "Ana Mureșan");
  assert.equal(f.semnaturaTehnician, "Mihai Popa");
  assert.equal(f.currency, "RON");
  assert.equal(f.currencyStated, false);
  const filled = f.piese.filter((p) => p.denumire);
  assert.equal(f.piese.length, 15);
  assert.deepEqual(filled, [
    { nr: 1, denumire: "Perie cilindrică 55 cm", cod: "L08-5501", cantitate: "1", pretEur: "345.50" },
    { nr: 2, denumire: "Filtru HEPA", cod: "107413450", cantitate: "2", pretEur: "89.90" },
    { nr: 3, denumire: "Garnitură racletă spate", cod: "56601712", cantitate: "1", pretEur: "152.75" },
  ]);

  const fisa = buildRoDraftFisa(f, { technicianName: "Ignored Because Sheet Has One" });
  assert.match(fisa.id, /^[0-9a-f-]{36}$/);
  assert.equal(fisa.contentLocale, "ro");
  assert.equal(fisa.currency, "RON");
  assert.equal(fisa.currencyManual, false);
  assert.equal(fisa.reviewed, false);
  assert.equal(fisa.semnaturaClientDataUrl, undefined);
  assert.equal(fisa.semnaturaTehnicianDataUrl, undefined);
  assert.equal(fisa.semnaturaTehnician, "Mihai Popa");
  assert.equal(fisa.nrFisa, "2026-0421");
  assert.equal(fisa.client, "Hotel Continental Oradea");

  // Catalog upsert from the same file
  const ex = roExtractFromDraft(f);
  const cr = upsertClientFromRo(ex, [], "upsert");
  const er = upsertEquipmentFromRo(ex, [], "upsert");
  assert.equal(cr.added, 1);
  assert.equal(cr.list[0].name, "Hotel Continental Oradea");
  assert.equal(cr.list[0].locatie, "Str. Republicii 12, Oradea");
  assert.equal(er.added, 1);
  assert.equal(er.list[0].model, "Nilfisk SC500");
  assert.equal(er.list[0].serie, "SN-998877");

  // Backup round-trip keeps it
  const v = validateBackup(JSON.parse(JSON.stringify({
    version: BACKUP_VERSION, exportedAt: "x", fise: [fisa], settings: { companyName: "X", cui: "" },
  })));
  assert.ok(v.ok && v.data.fise[0].client === "Hotel Continental Oradea");
  return fisa;
}

function checkEuroVariant() {
  // Same sheet but the stock "PRET € FARA Tva/buc." header → EUR, manual
  const wb = load("docs/fixture-fisa-ro-filled.xlsx");
  const ws = wb.Sheets["Fisa"];
  ws["H22"] = { t: "s", v: "PRET € FARA Tva/buc." };
  const res = parseRoFisaWorkbook(wb);
  assert.ok(res.ok);
  if (!res.ok) return;
  assert.equal(res.fields.currency, "EUR");
  const fisa = buildRoDraftFisa(res.fields);
  assert.equal(fisa.currency, "EUR");
  assert.equal(fisa.currencyManual, true);
  assert.equal(resolveCurrency(fisa), "EUR");
  // Price cells saying "lei" beat the € header
  ws["H24"] = { t: "s", v: "345,50 lei" };
  const res2 = parseRoFisaWorkbook(wb);
  assert.ok(res2.ok && res2.fields.currency === "RON");
}

function checkCsv() {
  // CSV (semicolon, RO decimal commas), value-below + no Nr.Fisa → normal numbering
  const csv = [
    "UTILAJE PROFESIONALE PENTRU CURATENIE;;;",
    "X;FISA DE REVIZIE;;",
    "CLIENT:;Spital Județean Cluj;;",
    "MODEL UTILAJ:;Kärcher BR 40/10;;",
    "SERIA:;;;",
    "KB-001;;;",
    "RECLAMATIE /SOLICITARE CLIENT:;;;",
    "Revizie anuală;;;",
    "PIESE SI MATERIALE:;;;",
    "Nr.;DENUMIRE PIESA/MATERIAL;Cant.;PRET € FARA Tva/buc.",
    "1;Lamelă cauciuc;2;12,40 €",
    "DATA INTERVENTIEI TEHNICE;;;",
    "05.10.2026;;;",
  ].join("\n");
  const res = parseRoFisaWorkbook(readRoWorkbook(new TextEncoder().encode(csv), "x.csv"));
  assert.ok(res.ok, "CSV should parse");
  if (!res.ok) return;
  const f = res.fields;
  assert.equal(f.tip, "Revizie");
  assert.equal(f.client, "Spital Județean Cluj");
  assert.equal(f.modelUtilaj, "Kärcher BR 40/10");
  assert.equal(f.serie, "KB-001");
  assert.equal(f.reclamatie, "Revizie anuală");
  assert.equal(f.dataInterventiei, "2026-10-05");
  assert.equal(f.piese[0].denumire, "Lamelă cauciuc");
  assert.equal(f.piese[0].cantitate, "2");
  assert.equal(f.piese[0].pretEur, "12.40");
  assert.equal(f.currency, "EUR");
  const fisa = buildRoDraftFisa(f, { technicianName: "Ion Popescu", now: new Date("2026-10-05T10:00:00Z") });
  assert.match(fisa.nrFisa, /^2026-\d{4}$/);
  assert.equal(fisa.semnaturaTehnician, "Ion Popescu");
}

function checkEmptyAndForeign() {
  for (const p of [
    "docs/fisa-template-curatenie.xlsx",
    "/workspace/client-excel/Model-Fisa-interventie.xlsx",
    "/workspace/client-excel/client-example.xlsx",
  ]) {
    let buf: Buffer;
    try { buf = readFileSync(p); } catch { continue; }
    const res = parseRoFisaWorkbook(readRoWorkbook(buf, p));
    assert.deepEqual(res, { ok: false, error: "empty" }, `${p} → empty`);
  }
  // Legacy layout fixture (partially filled) still parses
  const legacy = parseRoFisaWorkbook(load("docs/fixture-fisa-ro-layout.xlsx"));
  assert.ok(legacy.ok);
  if (legacy.ok) {
    assert.equal(legacy.fields.client, "Hotel Continental");
    assert.equal(legacy.fields.modelUtilaj, "Nilfisk SC500");
    assert.equal(legacy.fields.serie, "SN-998877");
    assert.equal(legacy.fields.nrFisa, "2024-015");
    assert.equal(legacy.fields.tip, "Reparație");
    assert.equal(legacy.fields.manoperaOre, "2.5");
    assert.equal(legacy.fields.deplasareDaNu, "DA");
  }
  // Catalog-style workbook → not a fișă
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Client", "Locatie"], ["A", "B"]]), "Clienti");
  assert.deepEqual(parseRoFisaWorkbook(wb), { ok: false, error: "not_fisa" });
  // Garbage CSV
  const junk = readRoWorkbook(new TextEncoder().encode("a,b\n1,2"), "j.csv");
  assert.deepEqual(parseRoFisaWorkbook(junk), { ok: false, error: "not_fisa" });
}

async function checkPdf(fisa: ReturnType<typeof buildRoDraftFisa>) {
  const blob = await generateFisaPdf(
    fisa,
    { companyName: "UTILAJE PROFESIONALE PENTRU CURĂȚENIE", cui: "RO12345678" },
    fisa.contentLocale || "ro"
  );
  const outDir = "/workspace/screenshots/excel-draft";
  mkdirSync(outDir, { recursive: true });
  const pdfPath = `${outDir}/excel-draft.pdf`;
  writeFileSync(pdfPath, Buffer.from(await blob.arrayBuffer()));
  const txt = execFileSync("pdftotext", ["-layout", pdfPath, "-"]).toString("utf8");
  for (const needle of [
    "Hotel Continental Oradea",
    "Nilfisk SC500",
    "SN-998877",
    "Nu aspiră apa, perie uzată",
    "Perie cilindrică 55 cm",
    "Filtru HEPA",
    "Garnitură racletă spate",
    "345.50",
    "Ana Mureșan",
    "PREȚ lei FĂRĂ Tva/buc.",
    "2026-0421",
  ]) {
    assert.ok(txt.includes(needle), `PDF text should contain "${needle}"`);
  }
  execFileSync("pdftoppm", ["-png", "-r", "110", "-f", "1", "-l", "1", pdfPath, `${outDir}/excel-draft-page`]);
  console.log("PDF:", pdfPath, "PNG:", `${outDir}/excel-draft-page-1.png`);
}

checkHelpers();
const fisa = checkFilled();
checkEuroVariant();
checkCsv();
checkEmptyAndForeign();
await checkPdf(fisa);
console.log("test-ro-fisa-draft.mts: OK");
