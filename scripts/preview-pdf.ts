import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { generateFisaPdf } from "../src/lib/pdf";
import { buildDemo } from "../src/lib/demos";
import { firmExample } from "../src/lib/defaults";
import type { PdfLocale } from "../src/lib/pdf";

async function main() {
  mkdirSync(join(process.cwd(), "tmp"), { recursive: true });
  const locales: PdfLocale[] = ["ro", "en", "pl"];
  for (const loc of locales) {
    const fisa = buildDemo("curatenie", loc);
    const settings = {
      companyName: firmExample(loc),
      cui:
        loc === "en" ? "12345678" : loc === "pl" ? "5250000000" : "RO12345678",
      address:
        loc === "en"
          ? "Manchester, UK"
          : loc === "pl"
            ? "Wrocław, Polska"
            : "Oradea, Bihor",
      phone:
        loc === "en"
          ? "+44 161 000 0000"
          : loc === "pl"
            ? "+48 71 000 00 00"
            : "0722 000 000",
    };
    const blob = await generateFisaPdf(fisa, settings, loc);
    const buf = Buffer.from(await blob.arrayBuffer());
    const out = join(process.cwd(), "tmp", `sample-${loc}-fisa.pdf`);
    writeFileSync(out, buf);
    console.log("wrote", out, buf.length, "bytes");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
