import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { generateFisaPdf } from "../src/lib/pdf";
import { buildDemo } from "../src/lib/demos";
import { firmExample } from "../src/lib/defaults";
import type { PdfLocale } from "../src/lib/pdf";

function dataUrlFromFile(path: string, mime: string): string {
  const buf = readFileSync(path);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function main() {
  mkdirSync(join(process.cwd(), "tmp"), { recursive: true });

  const pngLogo = dataUrlFromFile(
    join(process.cwd(), "tmp/fixture-logo.png"),
    "image/png"
  );
  const jpegLogo = dataUrlFromFile(
    join(process.cwd(), "tmp/fixture-logo.jpg"),
    "image/jpeg"
  );

  const locales: PdfLocale[] = ["ro", "en", "pl"];
  for (const loc of locales) {
    const fisa = buildDemo("curatenie", loc);
    const base = {
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

    for (const [tag, logoDataUrl] of [
      ["png", pngLogo],
      ["jpeg", jpegLogo],
    ] as const) {
      const blob = await generateFisaPdf(
        fisa,
        { ...base, logoDataUrl },
        fisa.contentLocale || loc
      );
      const buf = Buffer.from(await blob.arrayBuffer());
      const out = join(process.cwd(), "tmp", `sample-${loc}-logo-${tag}.pdf`);
      writeFileSync(out, buf);
      console.log("wrote", out, buf.length, "bytes");
    }

    // Keep legacy no-logo samples too
    const blob = await generateFisaPdf(fisa, base, fisa.contentLocale || loc);
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
