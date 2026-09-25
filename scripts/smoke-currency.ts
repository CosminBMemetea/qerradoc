/**
 * Smoke: per-fișă currency resolver, creation defaults, backup round-trip,
 * PDF generation with a non-default currency.
 * Run: npm run smoke:currency
 */
import assert from "node:assert/strict";
import {
  CURRENCIES,
  currencyAfterLocaleChange,
  defaultCurrencyForLocale,
  normalizeCurrency,
  resolveCurrency,
  symbolForCurrency,
} from "../src/lib/currency";
import { emptyFisa, type Fisa, type ContentLocale } from "../src/lib/types";
import type { CurrencyCode } from "../src/lib/currency";
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
  // Locale forms like resolveCurrency: en-GB / EN / pl-PL
  assert.equal(pdfCurrency({}, "en-GB"), "EUR");
  assert.equal(pdfCurrency({}, "EN"), "EUR");
  assert.equal(pdfCurrency({}, "pl-PL"), "PLN");
  assert.equal(pdfCurrency({}, "xx"), "RON");
  assert.equal(pdfCurrency({ currency: "usd" }, "en-GB"), "USD");
}

// Mirrors FisaForm: picker tap sets currency + currencyManual; language switch
// moves the currency via currencyAfterLocaleChange().
const pick = (f: Fisa, c: CurrencyCode): Fisa => ({ ...f, currency: c, currencyManual: true });
const switchLang = (f: Fisa, next: ContentLocale): Fisa => ({
  ...f,
  contentLocale: next,
  currency: currencyAfterLocaleChange(f, next),
});

function checkManualRoundTrip() {
  // RO, pick EUR → EN → RO: stays EUR
  let f = pick(emptyFisa({ contentLocale: "ro" }), "EUR");
  f = switchLang(f, "en");
  assert.equal(resolveCurrency(f), "EUR");
  f = switchLang(f, "ro");
  assert.equal(resolveCurrency(f), "EUR", "RO→EUR→EN→RO must keep EUR");

  // PL, pick lei → RO → PL: stays lei
  let g = pick(emptyFisa({ contentLocale: "pl" }), "RON");
  g = switchLang(g, "ro");
  assert.equal(resolveCurrency(g), "RON");
  g = switchLang(g, "pl");
  assert.equal(resolveCurrency(g), "RON", "PL pick lei → RO → PL must keep lei");

  // Explicit lei on RO is a manual pick too: RO pick lei → EN stays lei
  let h = pick(emptyFisa({ contentLocale: "ro" }), "RON");
  h = switchLang(h, "en");
  assert.equal(resolveCurrency(h), "RON", "explicit lei on RO is manual");

  // Untouched RO → EN → RO: lei, €, lei
  let u = emptyFisa({ contentLocale: "ro" });
  assert.equal(u.currencyManual, false);
  assert.equal(resolveCurrency(u), "RON");
  u = switchLang(u, "en");
  assert.equal(resolveCurrency(u), "EUR");
  u = switchLang(u, "ro");
  assert.equal(resolveCurrency(u), "RON");
  u = switchLang(u, "pl");
  assert.equal(resolveCurrency(u), "PLN");

  // Legacy rows (no flag): old rule — follow while equal to old default
  const legacyDefault: Partial<Fisa> = { contentLocale: "ro", currency: "RON" };
  assert.equal(currencyAfterLocaleChange(legacyDefault, "en"), "EUR");
  const legacyCustom: Partial<Fisa> = { contentLocale: "ro", currency: "GBP" };
  assert.equal(currencyAfterLocaleChange(legacyCustom, "en"), "GBP");
  const legacyNoCur: Partial<Fisa> = { contentLocale: "pl" };
  assert.equal(currencyAfterLocaleChange(legacyNoCur, "en"), "EUR");
  // Locale forms
  assert.equal(currencyAfterLocaleChange({ currencyManual: false }, "PL-pl"), "PLN");
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
  delete legacy.currencyManual;
  const junk = { ...emptyFisa({ contentLocale: "en" }), currency: "BTC", currencyManual: "yes" };
  const manual = { ...emptyFisa({ contentLocale: "pl" }), currency: "RON", currencyManual: true };
  const payload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    fise: [withCur, legacy, junk, manual],
    settings: { companyName: "X", cui: "" },
  };
  const res = validateBackup(JSON.parse(JSON.stringify(payload)));
  assert.ok(res.ok, "backup should validate");
  if (!res.ok) return;
  const [a, b, c, d] = res.data.fise;
  assert.equal(a.currencyManual, false);
  assert.equal(b.currencyManual, undefined, "legacy row has no flag");
  assert.equal(c.currencyManual, undefined, "non-boolean flag dropped");
  assert.equal(d.currencyManual, true);
  assert.equal(currencyAfterLocaleChange(d, "ro"), "RON");
  assert.equal(currencyAfterLocaleChange(d, "pl"), "RON");
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
  checkManualRoundTrip();
  checkBackup();
  await checkPdf();
  console.log("smoke-currency.ts: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
