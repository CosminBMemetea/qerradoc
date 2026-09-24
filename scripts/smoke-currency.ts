/**
 * Smoke: per-fișă currency resolver, creation defaults, backup round-trip,
 * PDF generation with a non-default currency.
 * Run: npm run smoke:currency
 */
import assert from "node:assert/strict";
import {
  CURRENCIES,
  defaultCurrencyForLocale,
  normalizeCurrency,
  resolveCurrency,
  symbolForCurrency,
} from "../src/lib/currency";
import { emptyFisa } from "../src/lib/types";
import { buildDemo } from "../src/lib/demos";
import { validateBackup, BACKUP_VERSION } from "../src/lib/backup";
import { generateFisaPdf, pdfCurrency } from "../src/lib/pdf";

function checkResolver() {
  assert.deepEqual([...CURRENCIES], ["RON", "EUR", "PLN", "GBP", "USD"]);
  assert.equal(defaultCurrencyForLocale("ro"), "RON");
  assert.equal(defaultCurrencyForLocale("en"), "EUR");
  assert.equal(defaultCurrencyForLocale("pl"), "PLN");
  assert.equal(defaultCurrencyForLocale(undefined), "RON");

  assert.equal(symbolForCurrency("RON"), "lei");
  assert.equal(symbolForCurrency("EUR"), "€");
  assert.equal(symbolForCurrency("PLN"), "zł");
  assert.equal(symbolForCurrency("GBP"), "£");
  assert.equal(symbolForCurrency("USD"), "$");

  assert.equal(normalizeCurrency(" eur "), "EUR");
  assert.equal(normalizeCurrency("JPY"), undefined);
  assert.equal(normalizeCurrency(42), undefined);

  // Explicit wins over locale
  assert.equal(resolveCurrency({ contentLocale: "ro", currency: "EUR" }), "EUR");
  assert.equal(resolveCurrency({ contentLocale: "pl", currency: "RON" }), "RON");
  // Legacy / missing / invalid → locale default
  assert.equal(resolveCurrency({ contentLocale: "pl" }), "PLN");
  assert.equal(resolveCurrency({ contentLocale: "en", currency: "XXX" }), "EUR");
  assert.equal(resolveCurrency({ contentLocale: "EN-GB" }), "EUR");
  assert.equal(resolveCurrency({}), "RON");
  assert.equal(resolveCurrency(null), "RON");

  assert.equal(pdfCurrency({}, "pl"), "PLN");
  assert.equal(pdfCurrency({ currency: "GBP" }, "ro"), "GBP");
}

function checkCreationDefaults() {
  assert.equal(emptyFisa().currency, "RON");
  assert.equal(emptyFisa({ contentLocale: "en" }).currency, "EUR");
  assert.equal(emptyFisa({ contentLocale: "pl" }).currency, "PLN");
  assert.equal(emptyFisa({ contentLocale: "pl", currency: "USD" }).currency, "USD");
  assert.equal(buildDemo("curatenie", "ro").currency, "RON");
  assert.equal(buildDemo("tamplarie", "en").currency, "EUR");
  assert.equal(buildDemo("stoma", "pl").currency, "PLN");
}

function checkBackup() {
  const withCur = { ...emptyFisa({ contentLocale: "ro" }), currency: "EUR" };
  const legacy: Record<string, unknown> = { ...emptyFisa({ contentLocale: "pl" }) };
  delete legacy.currency;
  const junk = { ...emptyFisa({ contentLocale: "en" }), currency: "BTC" };
  const payload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    fise: [withCur, legacy, junk],
    settings: { companyName: "X", cui: "" },
  };
  const res = validateBackup(JSON.parse(JSON.stringify(payload)));
  assert.ok(res.ok, "backup should validate");
  if (!res.ok) return;
  const [a, b, c] = res.data.fise;
  assert.equal(a.currency, "EUR");
  assert.equal(resolveCurrency(a), "EUR");
  assert.equal(b.currency, undefined);
  assert.equal(resolveCurrency(b), "PLN");
  assert.equal(c.currency, undefined);
  assert.equal(resolveCurrency(c), "EUR");
}

async function checkPdf() {
  const fisa = { ...buildDemo("curatenie", "ro"), currency: "GBP" as const };
  const blob = await generateFisaPdf(fisa, { companyName: "Test SRL", cui: "" }, "ro");
  const buf = Buffer.from(await blob.arrayBuffer());
  assert.ok(buf.length > 1000, "PDF should be non-trivial size");
}

async function main() {
  checkResolver();
  checkCreationDefaults();
  checkBackup();
  await checkPdf();
  console.log("smoke-currency.ts: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
