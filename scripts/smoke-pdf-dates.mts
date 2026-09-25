/**
 * Smoke: every date in the PDF follows the fișă's contentLocale
 * (ro/pl dd.mm.yyyy, en dd/mm/yyyy) — checked with pdftotext — and the
 * share message uses the same format.
 * Run: npm run smoke:pdf-dates   (needs poppler-utils / pdftotext)
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyFisa, type ContentLocale } from "../src/lib/types.ts";
import { generateFisaPdf } from "../src/lib/pdf.ts";
import { clientMessage } from "../src/lib/send-to-client.ts";
import { docDate, localIsoDate } from "../src/lib/date-format.ts";

const dir = mkdtempSync(join(tmpdir(), "pdf-dates-"));
const EXPECT: Record<ContentLocale, { a: string; i: string; stamp: RegExp }> = {
  ro: { a: "18.09.2026", i: "19.09.2026", stamp: /\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/ },
  en: { a: "18/09/2026", i: "19/09/2026", stamp: /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/ },
  pl: { a: "18.09.2026", i: "19.09.2026", stamp: /\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/ },
};

assert.equal(docDate("2026-09-19", "en"), "19/09/2026");
assert.equal(docDate("2026-09-19T10:00:00.000Z", "ro"), "19.09.2026");
assert.equal(docDate("ieri", "ro"), "ieri", "non-ISO text kept");
assert.equal(docDate("", "pl"), "");

for (const loc of ["ro", "en", "pl"] as ContentLocale[]) {
  const fisa = emptyFisa({
    contentLocale: loc,
    nrFisa: "2026-0042",
    client: "Hotel Test",
    dataAnuntarii: "2026-09-18",
    dataInterventiei: "2026-09-19",
  });
  const blob = await generateFisaPdf(fisa, { companyName: "Test SRL", cui: "" }, loc);
  const pdf = join(dir, `${loc}.pdf`);
  writeFileSync(pdf, Buffer.from(await blob.arrayBuffer()));
  const text = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" });
  const e = EXPECT[loc];
  assert.ok(text.includes(e.a), `${loc}: fault-reported date ${e.a}`);
  assert.ok(text.includes(e.i), `${loc}: intervention date ${e.i}`);
  assert.ok(!/\b20\d\d-\d\d-\d\d\b/.test(text), `${loc}: no ISO dates in PDF`);
  assert.match(text, e.stamp, `${loc}: footer stamp in locale format`);
  assert.ok(clientMessage(fisa, { companyName: "Test SRL" }).includes(e.i), `${loc}: share message date`);
  console.log(`[${loc}] ok: ${e.a}, ${e.i}`);
}
// New sheet's default date = LOCAL date (00:00–03:00 Bucharest is not "yesterday").
{
  const prevTz = process.env.TZ;
  process.env.TZ = "Europe/Bucharest";
  const at = new Date("2026-09-25T22:30:00Z"); // 01:30 EEST on 26 Sep
  assert.equal(localIsoDate(at), "2026-09-26");
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a: unknown[]) {
      if (a.length) super(...(a as [string]));
      else super(at.getTime());
    }
    static now() { return at.getTime(); }
  }
  (globalThis as { Date: DateConstructor }).Date = FakeDate as unknown as DateConstructor;
  try {
    assert.equal(emptyFisa().dataInterventiei, "2026-09-26", "emptyFisa uses local date");
    assert.ok(clientMessage(emptyFisa({ nrFisa: "1", dataInterventiei: "", contentLocale: "ro" }), { companyName: "" }).includes("26.09.2026"), "share msg fallback = local today");
  } finally {
    (globalThis as { Date: DateConstructor }).Date = RealDate;
    if (prevTz === undefined) delete process.env.TZ; else process.env.TZ = prevTz;
  }
  console.log("[local-date] ok: 01:30 EEST → 2026-09-26");
}
console.log("smoke-pdf-dates: OK");
