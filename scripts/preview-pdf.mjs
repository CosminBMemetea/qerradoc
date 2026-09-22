/** Wrapper: node scripts/preview-pdf.mjs → runs TypeScript via tsx */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync("npx", ["--yes", "tsx", "scripts/preview-pdf.ts"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);
