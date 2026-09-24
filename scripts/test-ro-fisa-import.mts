import { createRequire } from "module";
import { readFileSync } from "fs";
import {
  isRoInterventionLayout,
  extractRoInterventionFields,
} from "../src/lib/catalog-ro-fisa";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx") as typeof import("xlsx");

function rowsFromSheet(sheet: XLSX.WorkSheet): string[][] {
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as unknown[][];
  return rows.map((r) =>
    (Array.isArray(r) ? r : []).map((c) => String(c ?? "").trim())
  );
}

for (const f of [
  "docs/fixture-fisa-ro-layout.xlsx",
  "/workspace/client-excel/client-example.xlsx",
  "/workspace/client-excel/Model-Fisa-interventie.xlsx",
  "docs/fisa-template-curatenie.xlsx",
  "public/templates/querra-catalog-template.xlsx",
]) {
  const buf = readFileSync(f);
  const wb = XLSX.read(buf, { type: "buffer" });
  const rows = rowsFromSheet(wb.Sheets[wb.SheetNames[0]]);
  const is = isRoInterventionLayout(rows);
  console.log("\n==", f);
  console.log("detect:", is);
  if (is) console.log(JSON.stringify(extractRoInterventionFields(rows), null, 2));
}
