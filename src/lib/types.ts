export type TipFisa = "Constatare" | "Reparație" | "Revizie" | "Punere în funcțiune";

export type TemplateKind = "curatenie" | "tamplarie" | "stoma";

/** Language of the sheet content / PDF labels / currency (locked at creation). */
export type ContentLocale = "ro" | "en" | "pl";

/** Fallback when a stored fișă has no contentLocale (legacy rows → RO). */
export function resolveContentLocale(
  fisa: { contentLocale?: string | null } | null | undefined
): ContentLocale {
  const loc = fisa?.contentLocale;
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
  photoDataUrl?: string;
  /** Optional voice note (MediaRecorder data URL) when speech-to-text fails */
  audioNoteDataUrl?: string;
  /** Demo / industry template badge on list */
  templateKind?: TemplateKind;
  /**
   * Content language for this sheet (PDF labels, filename, share text, currency).
   * Locked at creation from UI locale; independent of later UI language switches.
   * Missing on legacy rows → treat as "ro" via resolveContentLocale().
   */
  contentLocale?: ContentLocale;
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
  return {
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
}

export const TIPURI: TipFisa[] = [
  "Constatare",
  "Reparație",
  "Revizie",
  "Punere în funcțiune",
];
