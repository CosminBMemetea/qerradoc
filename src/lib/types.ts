import { defaultCurrencyForLocale, type CurrencyCode } from "./currency";

export type { CurrencyCode } from "./currency";

export type TipFisa = "Constatare" | "Reparație" | "Revizie" | "Punere în funcțiune";

export type TemplateKind = "curatenie" | "tamplarie" | "stoma";

/** Language of the sheet content / PDF labels (locked at creation; also seeds the default currency). */
export type ContentLocale = "ro" | "en" | "pl";

/** Fallback when a stored fișă has no contentLocale (legacy rows → RO).
 *  Normalizes casing / region tags: pl, PL, pl-PL → pl.
 */
export function resolveContentLocale(
  fisa: { contentLocale?: string | null } | null | undefined
): ContentLocale {
  const raw = fisa?.contentLocale;
  if (raw == null || raw === "") return "ro";
  const loc = String(raw).toLowerCase().slice(0, 2);
  if (loc === "en" || loc === "pl" || loc === "ro") return loc;
  return "ro";
}

export interface Piesa {
  nr: number;
  denumire: string;
  cod: string;
  cantitate: string;
  pretEur: string;
}

export interface Fisa {
  id: string;
  tip: TipFisa;
  nrFisa: string;
  proprietar: string;
  client: string;
  locatie: string;
  modelUtilaj: string;
  serie: string;
  oreFunctionare: string;
  manoperaOre: string;
  deplasareKm: string;
  deplasareDaNu: "DA" | "NU" | "";
  reclamatie: string;
  piese: Piesa[];
  dataAnuntarii: string;
  dataInterventiei: string;
  observatii: string;
  motiveInlocuire: string;
  semnaturaClient: string;
  semnaturaTehnician: string;
  /** PNG data URL from on-device SignaturePad (client). */
  semnaturaClientDataUrl?: string;
  /** PNG data URL from on-device SignaturePad (technician). */
  semnaturaTehnicianDataUrl?: string;
  photoDataUrl?: string;
  /** Optional voice note (MediaRecorder data URL) when speech-to-text fails */
  audioNoteDataUrl?: string;
  /** Demo / industry template badge on list */
  templateKind?: TemplateKind;
  /**
   * Content language for this sheet (PDF labels, filename, share text).
   * Also the fallback for `currency` when a sheet has none.
   * Locked at creation from UI locale; independent of later UI language switches.
   * Missing on legacy rows → treat as "ro" via resolveContentLocale().
   */
  contentLocale?: ContentLocale;
  /**
   * Currency for prices on this sheet (form, PDF headers), independent of
   * contentLocale. Set at creation from the locale default; missing on legacy
   * rows → resolveCurrency() falls back to the contentLocale default.
   */
  currency?: CurrencyCode;
  createdAt: string;
  updatedAt: string;
  reviewed: boolean;
}

export interface FirmSettings {
  companyName: string;
  cui: string;
  logoDataUrl?: string;
  address?: string;
  phone?: string;
}

export interface LicenseState {
  activated: boolean;
  licenseKey: string;
  activatedAt?: string;
  maxUsers: number;
}

export interface Session {
  firmName: string;
  technicianName: string;
  loggedInAt: string;
}

export const EMPTY_PIESE = (): Piesa[] =>
  Array.from({ length: 15 }, (_, i) => ({
    nr: i + 1,
    denumire: "",
    cod: "",
    cantitate: "",
    pretEur: "",
  }));

export function emptyFisa(partial?: Partial<Fisa>): Fisa {
  const now = new Date().toISOString();
  const base: Fisa = {
    id: crypto.randomUUID(),
    tip: "Reparație",
    nrFisa: "",
    proprietar: "",
    client: "",
    locatie: "",
    modelUtilaj: "",
    serie: "",
    oreFunctionare: "",
    manoperaOre: "",
    deplasareKm: "",
    deplasareDaNu: "",
    reclamatie: "",
    piese: EMPTY_PIESE(),
    dataAnuntarii: "",
    dataInterventiei: new Date().toISOString().slice(0, 10),
    observatii: "",
    motiveInlocuire: "",
    semnaturaClient: "",
    semnaturaTehnician: "",
    createdAt: now,
    updatedAt: now,
    reviewed: false,
    contentLocale: "ro",
    ...partial,
  };
  // Default currency from the sheet's contentLocale unless explicitly given.
  return {
    ...base,
    currency:
      partial?.currency ??
      defaultCurrencyForLocale(resolveContentLocale(base)),
  };
}

export const TIPURI: TipFisa[] = [
  "Constatare",
  "Reparație",
  "Revizie",
  "Punere în funcțiune",
];

/** Local catalog entry — client (on-device only). */
export interface CatalogClient {
  id: string;
  name: string;
  locatie?: string;
  note?: string;
  updatedAt: string;
}

/** Local catalog entry — equipment / utilaj (on-device only). */
export interface CatalogEquipment {
  id: string;
  model: string;
  serie?: string;
  clientName?: string;
  note?: string;
  updatedAt: string;
}
