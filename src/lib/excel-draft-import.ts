"use client";

import type { Fisa } from "./types";
import {
  getCatalogClients,
  getCatalogEquipment,
  getSession,
  getSettings,
  saveCatalogClients,
  saveCatalogEquipment,
  saveFisa,
} from "./db";
import { upsertClientFromRo, upsertEquipmentFromRo } from "./catalog-ro-fisa";
import {
  buildRoDraftFisa,
  parseRoFisaWorkbook,
  readRoWorkbook,
  roExtractFromDraft,
} from "./ro-fisa-draft";

export type ExcelDraftError = "numbers" | "not_fisa" | "empty" | "read_failed";

export type ExcelDraftResult =
  | { ok: true; fisa: Fisa; sheetName: string; warnings: string[] }
  | { ok: false; error: ExcelDraftError };

/**
 * Filled client Excel/CSV (RO fișă layout) → NEW draft fișă saved on-device,
 * plus catalog upsert (client / equipment) from the same file, like Settings.
 * Nothing is created when the layout is missing or empty.
 */
export async function importExcelAsDraft(file: File): Promise<ExcelDraftResult> {
  if (/\.numbers$/i.test(file.name)) return { ok: false, error: "numbers" };
  let parsed: ReturnType<typeof parseRoFisaWorkbook>;
  try {
    const buf = await file.arrayBuffer();
    parsed = parseRoFisaWorkbook(readRoWorkbook(buf, file.name));
  } catch {
    return { ok: false, error: "read_failed" };
  }
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const [session, firm] = await Promise.all([getSession(), getSettings().catch(() => null)]);
  const fisa = buildRoDraftFisa(parsed.fields, {
    technicianName: session?.technicianName,
    defaultTip: firm?.defaultTip,
  });
  await saveFisa(fisa);

  try {
    const extract = roExtractFromDraft(parsed.fields);
    const [clients, equipment] = await Promise.all([
      getCatalogClients(),
      getCatalogEquipment(),
    ]);
    const cr = upsertClientFromRo(extract, clients, "upsert");
    const er = upsertEquipmentFromRo(extract, equipment, "upsert");
    await Promise.all([
      saveCatalogClients(cr.list),
      saveCatalogEquipment(er.list),
    ]);
  } catch {
    /* catalog learn is best-effort */
  }

  return {
    ok: true,
    fisa,
    sheetName: parsed.sheetName,
    warnings: parsed.warnings,
  };
}
