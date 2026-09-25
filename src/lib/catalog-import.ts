"use client";

import * as XLSX from "xlsx";
import {
  getCatalogClients,
  getCatalogEquipment,
  saveCatalogClients,
  saveCatalogEquipment,
} from "./db";
import { downloadBlob } from "./pdf";
import { parseCatalogWorkbook, type CatalogImportMode } from "./catalog-parse";

export type { RoFisaExtract } from "./catalog-ro-fisa";
export { isRoInterventionLayout, extractRoInterventionFields } from "./catalog-ro-fisa";

export type { CatalogImportMode };

export type CatalogImportResult = {
  clientsAdded: number;
  clientsUpdated: number;
  clientsSkipped: number;
  equipmentAdded: number;
  equipmentUpdated: number;
  equipmentSkipped: number;
};

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error("read_failed"));
    };
    reader.onerror = () => reject(reader.error || new Error("read_failed"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Import clients + equipment from .xlsx / .xls / .csv.
 * Prefer workbook sheets Clienti/Utilaje (also Clients/Equipment, Klienci/Urzadzenia).
 * Also accepts classic RO intervention / fișă sheets (label/value layout).
 * Single-sheet CSV: detect by columns (Model → equipment, Client/Nume → clients).
 * Apple Numbers: export to Excel (.xlsx) first — .numbers is not parsed in-browser.
 */
export async function importCatalogFile(
  file: File,
  mode: CatalogImportMode = "upsert"
): Promise<CatalogImportResult> {
  const buf = await readFileAsArrayBuffer(file);
  const wb = XLSX.read(buf, { type: "array", codepage: 65001 });

  const [existingClients, existingEquip] = await Promise.all([
    getCatalogClients(),
    getCatalogEquipment(),
  ]);

  const parsed = parseCatalogWorkbook(wb, existingClients, existingEquip, mode);
  const clientsResult = parsed.clients;
  const equipResult = parsed.equipment;

  await Promise.all([
    saveCatalogClients(clientsResult.list),
    saveCatalogEquipment(equipResult.list),
  ]);

  return {
    clientsAdded: clientsResult.added,
    clientsUpdated: clientsResult.updated,
    clientsSkipped: clientsResult.skipped,
    equipmentAdded: equipResult.added,
    equipmentUpdated: equipResult.updated,
    equipmentSkipped: equipResult.skipped,
  };
}

/** Export current catalogs as a workbook with Clienti + Utilaje sheets. */
export async function exportCatalogDownload(): Promise<{
  clients: number;
  equipment: number;
  filename: string;
}> {
  const [clients, equipment] = await Promise.all([
    getCatalogClients(),
    getCatalogEquipment(),
  ]);
  const wb = XLSX.utils.book_new();
  const clientsAoa: (string | undefined)[][] = [
    ["Client", "Locatie", "Note"],
    ...clients.map((c) => [c.name, c.locatie || "", c.note || ""]),
  ];
  const equipAoa: (string | undefined)[][] = [
    ["Model", "Serie", "Client", "Note"],
    ...equipment.map((e) => [
      e.model,
      e.serie || "",
      e.clientName || "",
      e.note || "",
    ]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(clientsAoa),
    "Clienti"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(equipAoa),
    "Utilaje"
  );
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const y = new Date();
  const filename = `querra-catalog-${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}.xlsx`;
  downloadBlob(blob, filename);
  return { clients: clients.length, equipment: equipment.length, filename };
}
