/**
 * Tiny Node smoke: contentLocale lock helpers.
 * Run: node scripts/smoke-content-locale.mjs
 * (Optionally with PDF assert via: npx tsx scripts/smoke-content-locale.ts)
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// Lightweight inline mirror of resolveContentLocale so this runs without tsx.
function resolveContentLocale(fisa) {
  const raw = fisa?.contentLocale;
  if (raw == null || raw === "") return "ro";
  const loc = String(raw).toLowerCase().slice(0, 2);
  if (loc === "en" || loc === "pl" || loc === "ro") return loc;
  return "ro";
}

function pdfFilePrefix(locale) {
  const loc = resolveContentLocale({ contentLocale: locale });
  if (loc === "en") return "JobSheet";
  if (loc === "pl") return "Protokol";
  return "Fisa";
}

const cases = [
  [{ contentLocale: "pl" }, "pl"],
  [{ contentLocale: "PL" }, "pl"],
  [{ contentLocale: "pl-PL" }, "pl"],
  [{ contentLocale: "en" }, "en"],
  [{ contentLocale: "EN-GB" }, "en"],
  [{ contentLocale: "ro" }, "ro"],
  [{ contentLocale: null }, "ro"],
  [{}, "ro"],
  [null, "ro"],
];

for (const [input, expected] of cases) {
  const got = resolveContentLocale(input);
  assert.equal(got, expected, `resolveContentLocale(${JSON.stringify(input)}) → ${got}, want ${expected}`);
}

assert.equal(pdfFilePrefix("pl"), "Protokol");
assert.equal(pdfFilePrefix("PL"), "Protokol");
assert.equal(pdfFilePrefix("pl-PL"), "Protokol");

// Demo object shape: contentLocale locked at build time
const demoPl = { id: "demo", contentLocale: "pl", nrFisa: "CZ-2026-0187" };
assert.equal(resolveContentLocale(demoPl), "pl");
assert.equal(pdfFilePrefix(resolveContentLocale(demoPl)), "Protokol");

console.log("smoke-content-locale: OK (%d cases)", cases.length);
