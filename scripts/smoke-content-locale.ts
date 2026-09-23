import assert from "node:assert/strict";
import { resolveContentLocale } from "../src/lib/types";
import { buildDemo } from "../src/lib/demos";
import { generateFisaPdf, pdfFilePrefix } from "../src/lib/pdf";
import { firmExample } from "../src/lib/defaults";

function checkResolve() {
  const cases: Array<
    [{ contentLocale?: string | null } | null | undefined, string]
  > = [
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
    assert.equal(resolveContentLocale(input), expected);
  }
}

async function checkDemoAndPdf() {
  const fisa = buildDemo("curatenie", "pl");
  assert.equal(fisa.contentLocale, "pl");
  assert.equal(resolveContentLocale(fisa), "pl");
  assert.equal(pdfFilePrefix(resolveContentLocale(fisa)), "Protokol");

  // Generate to ensure PL path does not throw; skip binary label assert
  // (jsPDF embeds text via custom fonts — not reliably searchable as plain strings).
  const blob = await generateFisaPdf(
    fisa,
    {
      companyName: firmExample("pl"),
      cui: "5250000000",
      address: "Wrocław, Polska",
      phone: "+48 71 000 00 00",
    },
    resolveContentLocale(fisa)
  );
  const buf = Buffer.from(await blob.arrayBuffer());
  assert.ok(buf.length > 1000, "PDF should be non-trivial size");
  console.log("PL demo PDF bytes:", buf.length);
}

async function main() {
  checkResolve();
  await checkDemoAndPdf();
  console.log("smoke-content-locale.ts: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
