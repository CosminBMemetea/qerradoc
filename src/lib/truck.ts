/**
 * Camioane / Transport industry — pure helpers (no DOM / IndexedDB), shared by
 * the app, /api/extract and scripts/smoke-trucks.mts.
 *   - plate parse/normalize (RO, PL, generic EU after a plate keyword)
 *   - VIN validation (17 chars, no I/O/Q; ISO 3779 check digit as a warning)
 *   - deterministic truck field extraction from dictated text (traceable only)
 *   - per-truck history (match by normalized plate or VIN, date order)
 *   - labels ro/en/pl for the form and the PDF
 */
import type { ContentLocale, Fisa } from "./types";

export type TruckKind = "check" | "service" | "damage";
export const TRUCK_KINDS: TruckKind[] = ["check", "service", "damage"];
export type CheckStatus = "" | "ok" | "defect" | "na";
export type TruckDirection = "" | "plecare" | "intoarcere";

export const CHECK_ITEMS = [
  "anvelope",
  "lumini",
  "frane",
  "scurgeri",
  "incarcatura",
  "caroserie",
  "oglinzi",
  "stergatoare",
  "documente",
  "extinctor",
] as const;
export type CheckItemKey = (typeof CHECK_ITEMS)[number];

export const DAMAGE_ZONES = [
  "fata",
  "cabina_stanga",
  "cabina_dreapta",
  "acoperis",
  "lateral_stanga",
  "lateral_dreapta",
  "spate",
  "remorca",
  "roti",
  "parbriz",
] as const;
export type DamageZone = (typeof DAMAGE_ZONES)[number];

export interface TruckCheckItem {
  key: CheckItemKey;
  status: CheckStatus;
  note?: string;
  photoDataUrl?: string;
}
export interface TruckPhoto {
  dataUrl: string;
  caption: string;
}
export interface TruckData {
  kind: TruckKind;
  /** As typed/dictated (display form, e.g. "BH 12 ABC"). */
  plate: string;
  trailer?: string;
  driver?: string;
  vin?: string;
  /** Odometer reading (km), digits only. */
  km?: string;
  /** Local "YYYY-MM-DDTHH:mm". */
  dateTime?: string;
  direction?: TruckDirection;
  checklist?: TruckCheckItem[];
  /** service: technician's finding. */
  constatare?: string;
  /** damage: place of the incident. */
  place?: string;
  description?: string;
  photos?: TruckPhoto[];
  zones?: DamageZone[];
  parties?: string;
  /** Make/model, e.g. "Volvo FH 500". */
  model?: string;
  /** service: labour lines ("diagnoză sistem frânare – 1 h"); manoperaOre = sum. */
  labour?: TruckLabour[];
  /** Mandatory review: who confirmed the data (shown as "Verificat de" in the PDF). */
  verifiedBy?: string;
  verifiedAt?: string;
}
export interface TruckLabour {
  desc: string;
  ore: string;
}

/** Sum of labour line hours as "3.5" ("" when none). */
export function labourTotal(lines: TruckLabour[] | undefined): string {
  const n = (lines || []).reduce((a, l) => a + (Number(String(l.ore).replace(",", ".")) || 0), 0);
  return n ? String(Math.round(n * 100) / 100) : "";
}

/** Normalized search: plate or VIN contains the query (letters/digits only). */
export function matchesTruckQuery(q: string, plate: string, vin?: string): boolean {
  const k = normPlate(q);
  if (!k) return true;
  return normPlate(plate).includes(k) || normPlate(vin || "").includes(k);
}

/** Truck catalog entry (on-device), keyed by normalized plate. */
export interface CatalogTruck {
  id: string;
  plate: string;
  plateKey: string;
  vin?: string;
  model?: string;
  clientName?: string;
  driver?: string;
  updatedAt: string;
}
/** Parts catalog entry (pilot pack / on-device). */
export interface CatalogPart {
  denumire: string;
  cod?: string;
  pret?: string;
}

export function emptyChecklist(): TruckCheckItem[] {
  return CHECK_ITEMS.map((key) => ({ key, status: "" as CheckStatus }));
}

export function emptyTruck(kind: TruckKind, partial: Partial<TruckData> = {}): TruckData {
  return {
    kind,
    plate: "",
    trailer: "",
    driver: "",
    vin: "",
    km: "",
    dateTime: "",
    direction: kind === "check" ? "plecare" : "",
    checklist: kind === "check" ? emptyChecklist() : undefined,
    constatare: "",
    place: "",
    description: "",
    photos: kind === "check" ? undefined : [],
    labour: kind === "service" ? [] : undefined,
    zones: kind === "damage" ? [] : undefined,
    parties: "",
    model: "",
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// Plates
// ---------------------------------------------------------------------------

const RO_COUNTY = new Set(
  "AB AG AR B BC BH BN BR BT BV BZ CJ CL CS CT CV DB DJ GJ GL GR HD HR IF IL IS MH MM MS NT OT PH SB SJ SM SV TL TM TR VL VN VS".split(" ")
);
/** First letter of Polish plate prefixes (voivodeship). */
const PL_FIRST = new Set("BCDEFGKLNOPRSTWZ".split(""));

const fold = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[łŁ]/g, "l");

/** "bh-12 abc" → "BH12ABC" (letters/digits only, uppercase). */
export function normPlate(s: string): string {
  return fold(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export type PlateInfo = { plate: string; key: string; country: "RO" | "PL" | "EU" };

/** Parse a single plate string; null when it isn't a plausible plate. */
export function parsePlate(raw: string): PlateInfo | null {
  const key = normPlate(raw);
  if (!key) return null;
  const ro = /^([A-Z]{1,2})(\d{2,3})([A-Z]{3})$/.exec(key);
  if (ro && RO_COUNTY.has(ro[1]) && (ro[2].length === 2 || ro[1] === "B")) {
    return { plate: `${ro[1]} ${ro[2]} ${ro[3]}`, key, country: "RO" };
  }
  const pl = /^([A-Z]{2,3})([0-9][0-9A-Z]{3,4})$/.exec(key);
  if (pl && PL_FIRST.has(pl[1][0]) && key.length >= 7 && key.length <= 8) {
    return { plate: `${pl[1]} ${pl[2]}`, key, country: "PL" };
  }
  if (/^[A-Z0-9]{4,10}$/.test(key) && /[A-Z]/.test(key) && /\d/.test(key)) {
    return { plate: raw.trim().toUpperCase(), key, country: "EU" };
  }
  return null;
}

const PLATE_KW = /(?:nr\.?|numar(?:ul)?|numarul de|inmatriculare|inmatriculat|plate|reg(?:istration)?|rejestracja|rejestracyjny|tablice?)\s*[:#]?\s*/i;

/** Find a plate in free text (RO/PL strict anywhere; generic EU only after a plate keyword). */
export function findPlate(text: string): PlateInfo | null {
  const t = fold(text);
  // RO: "BH 12 ABC", "BH-12-ABC", "B 123 XYZ"
  const roRe = /\b([A-Za-z]{1,2})[\s-]?(\d{2,3})[\s-]?([A-Za-z]{3})\b/g;
  for (const m of Array.from(t.matchAll(roRe))) {
    const p = parsePlate(m[0]);
    if (p && p.country === "RO") return p;
  }
  // PL: "WA 12345", "KR 4N567", "PO1AB23"
  const plRe = /\b([A-Za-z]{2,3})[\s-]?([0-9][0-9A-Za-z]{3,4})\b/g;
  for (const m of Array.from(t.matchAll(plRe))) {
    const p = parsePlate(m[0]);
    if (p && p.country === "PL" && /^[A-Z]+$/.test(m[1])) return p;
  }
  // Generic EU after a keyword: "plate NL 12-ABC-3", "nr. înmatriculare 1-ABC-234"
  const kw = new RegExp(PLATE_KW.source + "([A-Za-z0-9][A-Za-z0-9 -]{3,12}[A-Za-z0-9])", "i").exec(t);
  if (kw) {
    const cand = kw[1].split(/\s+/).slice(0, 3).join(" ");
    for (let n = cand.split(" ").length; n >= 1; n--) {
      const c = cand.split(" ").slice(0, n).join(" ");
      const p = parsePlate(c);
      if (p) return p;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// VIN
// ---------------------------------------------------------------------------

const VIN_MAP: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const VIN_W = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export type VinCheck =
  | { valid: true; vin: string; checkDigitOk: boolean }
  | { valid: false; vin: string; reason: "empty" | "length" | "chars" };

/**
 * 17 characters, A–Z/0–9 without I, O, Q → valid. The ISO 3779 check digit
 * (position 9) is mandatory only in North America, so a mismatch is reported
 * (checkDigitOk=false) but doesn't make a European VIN invalid.
 */
export function validateVin(raw: string): VinCheck {
  const vin = (raw || "").toUpperCase().replace(/[\s-]/g, "");
  if (!vin) return { valid: false, vin, reason: "empty" };
  if (vin.length !== 17) return { valid: false, vin, reason: "length" };
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return { valid: false, vin, reason: "chars" };
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = vin[i];
    const v = /\d/.test(c) ? Number(c) : VIN_MAP[c];
    sum += v * VIN_W[i];
  }
  const r = sum % 11;
  const expect = r === 10 ? "X" : String(r);
  return { valid: true, vin, checkDigitOk: vin[8] === expect };
}

/** A 17-char VIN literally in the text (spaces inside allowed). */
export function findVin(text: string): string {
  const t = fold(text).toUpperCase();
  const m = t.match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
  if (m && /\d/.test(m[0]) && /[A-Z]/.test(m[0])) return m[0];
  const kw = /\b(?:VIN|SASIU|SERIE SASIU|CHASSIS)\s*[:#]?\s*([A-Z0-9 ]{17,24})/.exec(t);
  if (kw) {
    const c = kw[1].replace(/\s/g, "").slice(0, 17);
    if (validateVin(c).valid) return c;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Odometer
// ---------------------------------------------------------------------------

/**
 * Odometer km in the text: "452300 km", "452.300 km", "452 300 km",
 * "kilometraj 452300", "km la bord 452300". Small "35 km" (travel) is not an
 * odometer reading (needs ≥ 1000 or an odometer keyword).
 */
export function findOdometer(text: string): string {
  const t = fold(text).toLowerCase();
  const kw = /(?:kilometraj(?:ul)?|km la bord|bord|odometru|odometer|mileage|przebieg|licznik)\s*[:]?\s*(?:de\s*)?(\d{1,3}(?:[ .]\d{3})+|\d{3,7})/.exec(t);
  if (kw) return kw[1].replace(/[ .]/g, "");
  const re = /(\d{1,3}(?:[ .]\d{3})+|\d{4,7})\s*(?:km|kilometri|kilometers|kilometres|kilometrow)\b/g;
  for (const m of Array.from(t.matchAll(re))) {
    const n = m[1].replace(/[ .]/g, "");
    if (Number(n) >= 1000) return n;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Checklist defects from dictation
// ---------------------------------------------------------------------------

const ITEM_WORDS: Record<CheckItemKey, RegExp> = {
  anvelope: /\b(?:anvelop\w*|cauciuc\w*|pneu\w*|roat\w*|roti|tyres?|tires?|opon\w*|kol\w*)\b/,
  lumini: /\b(?:lumin\w*|far\w*|stop\w*|semnalizar\w*|bec\w*|lights?|headlights?|lamps?|indicators?|swiatl\w*|lamp\w*|kierunkowskaz\w*)\b/,
  frane: /\b(?:fran\w*|brakes?|hamul\w*|hamulc\w*)\b/,
  scurgeri: /\b(?:scurg\w*|picur\w*|pierde|pierderi|leaks?|leaking|wyciek\w*|cieknie)\b/,
  incarcatura: /\b(?:incarcatur\w*|ancorar\w*|ching\w*|marf\w*|load|cargo|straps?|ladun\w*|pas\w* transportow\w*)\b/,
  caroserie: /\b(?:caroseri\w*|lovitur\w*|indoit\w*|zgariet\w*|bodywork|body|dents?|karoseri\w*|wgniec\w*)\b/,
  oglinzi: /\b(?:oglin\w*|mirrors?|lusterk\w*)\b/,
  stergatoare: /\b(?:sterg\w*|wipers?|wycieraczk\w*)\b/,
  documente: /\b(?:document\w*|tahograf\w*|tachograph\w*|tachograf\w*|dokument\w*|licent\w*|cmr)\b/,
  extinctor: /\b(?:extinctor\w*|trus\w*|extinguisher\w*|first aid|gasnic\w*|apteczk\w*)\b/,
};
const DEFECT_WORDS =
  /\b(?:uzat\w*|defect\w*|nu (?:merge|functioneaza|aprinde)|ars\w*|spart\w*|fisurat\w*|crapat\w*|pierde|picura|lipsa|lipseste|expirat\w*|lovit\w*|indoit\w*|zgariat\w*|slab\w*|desumflat\w*|taiat\w*|rupt\w*|worn|broken|not working|missing|leak\w*|damaged|cracked|flat|expired|low|dent\w*|zuzyt\w*|uszkodzon\w*|nie dziala|brak\w*|pekniet\w*|cieknie|wyciek\w*|przetart\w*)\b/;
const OK_WORDS = /\b(?:ok|in regula|bune|bun|functioneaza|merg|fine|good|working|sprawn\w*|w porzadku|dobr\w*)\b/;

export type DetectedCheck = { key: CheckItemKey; status: "defect" | "ok"; note: string };

/**
 * Checklist items mentioned in the text. A clause (split on , ; . "și"/"and"/
 * "i" before a new item) naming an item AND a defect word → Defect with the
 * clause verbatim as the note; an item + "ok"/"în regulă" → OK. Nothing else.
 */
export function detectChecklist(text: string): DetectedCheck[] {
  const out: DetectedCheck[] = [];
  const clauses = (text || "").split(/[,;.\n]+|\s+(?:si|și|and|oraz)\s+/i).map((c) => c.trim()).filter(Boolean);
  for (const clause of clauses) {
    const f = fold(clause).toLowerCase();
    for (const key of CHECK_ITEMS) {
      if (!ITEM_WORDS[key].test(f)) continue;
      // "pierde ulei/combustibil/AdBlue" is a leak even without the word "scurgere".
      const defect = DEFECT_WORDS.test(f);
      const prev = out.find((d) => d.key === key);
      if (defect) {
        if (prev && prev.status === "defect") prev.note = `${prev.note}; ${clause}`;
        else if (prev) Object.assign(prev, { status: "defect", note: clause });
        else out.push({ key, status: "defect", note: clause });
      } else if (OK_WORDS.test(f) && !prev) {
        out.push({ key, status: "ok", note: "" });
      }
    }
    // A leak clause ("pierde ulei") mentions only the leak; tyre words etc.
    // in the same clause are handled above.
  }
  return out;
}

export type TruckExtraction = {
  plate: string;
  vin: string;
  km: string;
  checks: DetectedCheck[];
};

/** Deterministic, traceable truck fields (used by /api/extract and offline). */
export function extractTruckFields(text: string): TruckExtraction {
  const vin = findVin(text);
  // Don't read a plate out of the VIN.
  const plateSrc = vin ? text.replace(new RegExp(vin.split("").join("\\s?"), "i"), " ") : text;
  const p = findPlate(plateSrc);
  return { plate: p?.plate || "", vin, km: findOdometer(text), checks: detectChecklist(text) };
}

/** Apply an extraction onto a truck record; returns filled keys ("truck.plate", …). */
export function applyTruckExtraction(t: TruckData, ex: TruckExtraction): { truck: TruckData; filled: string[] } {
  const next: TruckData = { ...t };
  const filled: string[] = [];
  if (ex.plate && !t.plate) { next.plate = ex.plate; filled.push("truck.plate"); }
  if (ex.vin && !t.vin) { next.vin = ex.vin; filled.push("truck.vin"); }
  if (ex.km && !t.km) { next.km = ex.km; filled.push("truck.km"); }
  if (t.kind === "check" && ex.checks.length) {
    const list = (t.checklist && t.checklist.length ? t.checklist : emptyChecklist()).map((c) => ({ ...c }));
    for (const d of ex.checks) {
      const c = list.find((x) => x.key === d.key);
      if (!c || c.status) continue;
      c.status = d.status;
      if (d.note) c.note = d.note;
      filled.push(`truck.check.${d.key}`);
    }
    next.checklist = list;
  }
  return { truck: next, filled };
}

/** Merge trucks by plateKey (existing values win; blanks are filled). */
export function mergeTrucks(cur: CatalogTruck[], add: Partial<CatalogTruck>[]): CatalogTruck[] {
  const out = cur.map((t) => ({ ...t }));
  const now = new Date().toISOString();
  for (const a of add) {
    const key = normPlate(a.plate || "");
    if (!key) continue;
    const i = out.findIndex((t) => t.plateKey === key);
    if (i < 0) {
      out.push({
        id: a.id || `truck-${key}`,
        plate: (a.plate || "").trim(),
        plateKey: key,
        vin: a.vin || undefined,
        model: a.model || undefined,
        clientName: a.clientName || undefined,
        driver: a.driver || undefined,
        updatedAt: now,
      });
    } else {
      const t = out[i];
      out[i] = {
        ...t,
        vin: t.vin || a.vin || undefined,
        model: t.model || a.model || undefined,
        clientName: t.clientName || a.clientName || undefined,
        driver: a.driver || t.driver,
        updatedAt: now,
      };
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

/** Sort key for a truck fișă: its own date/time, else intervention date, else created. */
export function truckDate(f: Fisa): string {
  return f.truck?.dateTime || f.dataInterventiei || f.createdAt.slice(0, 10);
}

export function sameTruck(f: Fisa, plateKey: string, vin?: string): boolean {
  if (!f.truck) return false;
  if (plateKey && normPlate(f.truck.plate) === plateKey) return true;
  const v = (vin || "").toUpperCase();
  return !!v && v.length === 17 && (f.truck.vin || "").toUpperCase() === v;
}

/** All fișe of one truck, newest first (ties: newest createdAt first). */
export function truckHistory(fise: Fisa[], plate: string, vin?: string): Fisa[] {
  const key = normPlate(plate);
  return fise
    .filter((f) => sameTruck(f, key, vin))
    .sort((a, b) => truckDate(b).localeCompare(truckDate(a)) || b.createdAt.localeCompare(a.createdAt));
}

export function defectCount(f: Fisa): number {
  const t = f.truck;
  if (!t) return 0;
  if (t.kind === "check") return (t.checklist || []).filter((c) => c.status === "defect").length;
  if (t.kind === "damage") return (t.zones || []).length;
  return f.piese.filter((p) => p.denumire.trim()).length;
}

export type TruckStatus = "sent" | "signed" | "draft";
export function truckStatus(f: Fisa): TruckStatus {
  if (f.sentAt) return "sent";
  if (f.semnaturaClientDataUrl || f.semnaturaTehnicianDataUrl) return "signed";
  return "draft";
}

/** Trucks seen in fișe (for the /camioane list when the catalog is empty). */
export function trucksFromFise(fise: Fisa[]): { plate: string; plateKey: string; vin?: string; model?: string; count: number; last: string }[] {
  const m = new Map<string, { plate: string; plateKey: string; vin?: string; model?: string; count: number; last: string }>();
  for (const f of fise) {
    if (!f.truck?.plate) continue;
    const k = normPlate(f.truck.plate);
    const cur = m.get(k) || { plate: f.truck.plate, plateKey: k, vin: f.truck.vin || undefined, model: f.truck.model || undefined, count: 0, last: "" };
    cur.count++;
    const d = truckDate(f);
    if (d > cur.last) cur.last = d;
    if (!cur.vin && f.truck.vin) cur.vin = f.truck.vin;
    if (!cur.model && f.truck.model) cur.model = f.truck.model;
    m.set(k, cur);
  }
  return Array.from(m.values()).sort((a, b) => b.last.localeCompare(a.last));
}

// ---------------------------------------------------------------------------
// Labels (form uses UI locale; PDF uses the fișă's contentLocale)
// ---------------------------------------------------------------------------

type TL = {
  industry: string;
  kind: Record<TruckKind, string>;
  kindDesc: Record<TruckKind, string>;
  plate: string;
  trailer: string;
  driver: string;
  vin: string;
  vinInvalid: string;
  vinCheckWarn: string;
  km: string;
  dateTime: string;
  direction: string;
  plecare: string;
  intoarcere: string;
  checklist: string;
  item: Record<CheckItemKey, string>;
  status: Record<Exclude<CheckStatus, "">, string>;
  note: string;
  photo: string;
  addPhoto: string;
  removePhoto: string;
  model: string;
  client: string;
  reclamatie: string;
  constatare: string;
  observatii: string;
  manopera: string;
  piese: string;
  place: string;
  description: string;
  photos: string;
  caption: string;
  zones: string;
  zone: Record<DamageZone, string>;
  parties: string;
  sigDriver: string;
  sigTech: string;
  sigClient: string;
  sigReporter: string;
  sigOther: string;
  history: string;
  historyEmpty: string;
  trucks: string;
  defects: string;
  noDefects: string;
  st: Record<TruckStatus, string>;
  fillTitle: string;
  fillHint: string;
  fillBtn: string;
  fillBusy: string;
  fillNone: string;
  fillDone: string;
  reviewFirst: string;
  photoNote: string;
  pdfTitle: Record<TruckKind, string>;
  nr: string;
  date: string;
  cod: string;
  qty: string;
  price: string;
  total: string;
  footer: string;
  plateInvalid: string;
  labour: string;
  labourDesc: string;
  addLabour: string;
  verify: string;
  verifiedBy: string;
  verifyNeeded: string;
  search: string;
  openHistory: string;
  newTruck: string;
};

export const TRUCK_LABELS: Record<ContentLocale, TL> = {
  ro: {
    industry: "Camioane / Transport",
    kind: { check: "Verificare șofer", service: "Recepție / Reparație camion", damage: "Raport de daună" },
    kindDesc: {
      check: "Plecare / întoarcere — checklist OK / Defect / N/A, poze la defecte, semnătura șoferului",
      service: "Constatare / reparație: VIN, km, piese, manoperă; semnează tehnicianul și clientul",
      damage: "Poze cu descriere, zonele avariate, părțile implicate, semnături",
    },
    plate: "Nr. înmatriculare",
    trailer: "Remorcă (opțional)",
    driver: "Șofer",
    vin: "VIN (serie șasiu)",
    vinInvalid: "VIN invalid: trebuie 17 caractere, fără I, O, Q",
    vinCheckWarn: "Cifra de control nu corespunde (normal la multe VIN europene) — verifică pe talon",
    km: "Km (bord)",
    dateTime: "Data și ora",
    direction: "Moment",
    plecare: "Plecare",
    intoarcere: "Întoarcere",
    checklist: "Verificări",
    item: {
      anvelope: "Anvelope",
      lumini: "Lumini",
      frane: "Frâne",
      scurgeri: "Scurgeri (ulei / combustibil / AdBlue)",
      incarcatura: "Încărcătură / ancorare",
      caroserie: "Daune caroserie",
      oglinzi: "Oglinzi",
      stergatoare: "Ștergătoare",
      documente: "Documente / tahograf",
      extinctor: "Extinctor / trusă",
    },
    status: { ok: "OK", defect: "Defect", na: "N/A" },
    note: "Notă defect",
    photo: "Poză",
    addPhoto: "Adaugă poză",
    removePhoto: "Șterge poza",
    model: "Marcă / model",
    client: "Client / transportator",
    reclamatie: "Reclamație",
    constatare: "Constatare",
    observatii: "Observații / lucrări efectuate",
    manopera: "Manoperă (ore)",
    piese: "Piese",
    place: "Locul",
    description: "Descrierea daunei",
    photos: "Fotografii",
    caption: "Descriere poză",
    zones: "Zone avariate",
    zone: {
      fata: "Față / bară",
      cabina_stanga: "Cabină stânga",
      cabina_dreapta: "Cabină dreapta",
      acoperis: "Acoperiș / deflector",
      lateral_stanga: "Lateral stânga",
      lateral_dreapta: "Lateral dreapta",
      spate: "Spate / uși",
      remorca: "Remorcă",
      roti: "Roți / jante",
      parbriz: "Parbriz / geamuri",
    },
    parties: "Părți implicate",
    sigDriver: "Semnătură șofer",
    sigTech: "Semnătură tehnician",
    sigClient: "Semnătură client",
    sigReporter: "Semnătură declarant",
    sigOther: "Semnătură cealaltă parte",
    history: "Istoric camion",
    historyEmpty: "Nicio fișă pentru acest camion.",
    trucks: "Camioane",
    defects: "defecte",
    noDefects: "fără defecte",
    st: { sent: "Trimisă", signed: "Semnată", draft: "Ciornă" },
    fillTitle: "Completează din voce / text",
    fillHint: "Ex.: „BH 12 ABC, 452300 km, anvelopa stânga față uzată, pierde ulei”",
    fillBtn: "Completează câmpurile",
    fillBusy: "Se completează…",
    fillNone: "N-am găsit nimic de completat în text.",
    fillDone: "Am completat câmpurile marcate ✦ — verifică-le înainte de semnătură.",
    reviewFirst: "Câmpuri completate automat: verifică și apasă „Salvează” înainte de semnătură / PDF.",
    photoNote: "Pozele se atașează la fișă (fără citire automată a textului din poză).",
    pdfTitle: {
      check: "FIȘĂ VERIFICARE ȘOFER",
      service: "FIȘĂ CONSTATARE / REPARAȚIE CAMION",
      damage: "RAPORT DE DAUNĂ",
    },
    nr: "Nr.",
    date: "Data",
    cod: "Cod",
    qty: "Cant.",
    price: "Preț",
    total: "Total piese",
    footer: "Querra Fișă — document generat pe dispozitiv",
    plateInvalid: "Format neobișnuit — verifică numărul",
    labour: "Manoperă",
    labourDesc: "Operație (ex. diagnoză sistem frânare)",
    addLabour: "Adaugă manoperă",
    verify: "Am verificat datele din fișă",
    verifiedBy: "Verificat de",
    verifyNeeded: "Bifează „Am verificat datele” ca să poți salva, semna PDF-ul și trimite.",
    search: "Caută nr. sau VIN (ex. BH12 sau ultimele 6 din VIN)",
    openHistory: "Istoric camion",
    newTruck: "Fișă nouă pentru acest camion",
  },
  en: {
    industry: "Trucks / Transport",
    kind: { check: "Driver walkaround", service: "Truck service", damage: "Damage report" },
    kindDesc: {
      check: "Departure / return — OK / Defect / N/A checklist, defect photos, driver signs",
      service: "Inspection / repair: VIN, km, parts, labour; technician and client sign",
      damage: "Captioned photos, damaged areas, parties involved, signatures",
    },
    plate: "Registration plate",
    trailer: "Trailer (optional)",
    driver: "Driver",
    vin: "VIN",
    vinInvalid: "Invalid VIN: must be 17 characters, no I, O, Q",
    vinCheckWarn: "Check digit doesn't match (common for EU VINs) — verify on the registration",
    km: "Odometer (km)",
    dateTime: "Date and time",
    direction: "Check",
    plecare: "Departure",
    intoarcere: "Return",
    checklist: "Checks",
    item: {
      anvelope: "Tyres",
      lumini: "Lights",
      frane: "Brakes",
      scurgeri: "Leaks (oil / fuel / AdBlue)",
      incarcatura: "Load / securing",
      caroserie: "Body damage",
      oglinzi: "Mirrors",
      stergatoare: "Wipers",
      documente: "Documents / tachograph",
      extinctor: "Extinguisher / first-aid kit",
    },
    status: { ok: "OK", defect: "Defect", na: "N/A" },
    note: "Defect note",
    photo: "Photo",
    addPhoto: "Add photo",
    removePhoto: "Remove photo",
    model: "Make / model",
    client: "Client / carrier",
    reclamatie: "Reported problem",
    constatare: "Findings",
    observatii: "Notes / work done",
    manopera: "Labour (hours)",
    piese: "Parts",
    place: "Place",
    description: "Damage description",
    photos: "Photos",
    caption: "Caption",
    zones: "Damaged areas",
    zone: {
      fata: "Front / bumper",
      cabina_stanga: "Cab left",
      cabina_dreapta: "Cab right",
      acoperis: "Roof / deflector",
      lateral_stanga: "Left side",
      lateral_dreapta: "Right side",
      spate: "Rear / doors",
      remorca: "Trailer",
      roti: "Wheels / rims",
      parbriz: "Windscreen / windows",
    },
    parties: "Parties involved",
    sigDriver: "Driver signature",
    sigTech: "Technician signature",
    sigClient: "Client signature",
    sigReporter: "Reporter signature",
    sigOther: "Other party signature",
    history: "Truck history",
    historyEmpty: "No sheets for this truck.",
    trucks: "Trucks",
    defects: "defects",
    noDefects: "no defects",
    st: { sent: "Sent", signed: "Signed", draft: "Draft" },
    fillTitle: "Fill from voice / text",
    fillHint: "E.g. \"BH 12 ABC, 452300 km, front left tyre worn, leaking oil\"",
    fillBtn: "Fill the fields",
    fillBusy: "Filling…",
    fillNone: "Nothing to fill found in the text.",
    fillDone: "Filled the fields marked ✦ — check them before signing.",
    reviewFirst: "Auto-filled fields: check them and tap Save before signing / PDF.",
    photoNote: "Photos are attached to the sheet (no automatic text reading from photos).",
    pdfTitle: { check: "DRIVER WALKAROUND CHECK", service: "TRUCK INSPECTION / REPAIR SHEET", damage: "DAMAGE REPORT" },
    nr: "No.",
    date: "Date",
    cod: "Code",
    qty: "Qty",
    price: "Price",
    total: "Parts total",
    footer: "Querra Fișă — generated on device",
    plateInvalid: "Unusual format — check the plate",
    labour: "Labour",
    labourDesc: "Operation (e.g. brake system diagnosis)",
    addLabour: "Add labour",
    verify: "I have checked the data on this sheet",
    verifiedBy: "Checked by",
    verifyNeeded: "Tick \"I have checked the data\" to save, create the PDF and send.",
    search: "Search plate or VIN (e.g. BH12 or last 6 of VIN)",
    openHistory: "Truck history",
    newTruck: "New sheet for this truck",
  },
  pl: {
    industry: "Ciężarówki / Transport",
    kind: { check: "Kontrola kierowcy", service: "Serwis ciężarówki", damage: "Raport szkody" },
    kindDesc: {
      check: "Wyjazd / powrót — lista OK / Usterka / N/D, zdjęcia usterek, podpis kierowcy",
      service: "Diagnoza / naprawa: VIN, km, części, robocizna; podpisują serwisant i klient",
      damage: "Zdjęcia z opisem, uszkodzone strefy, strony zdarzenia, podpisy",
    },
    plate: "Nr rejestracyjny",
    trailer: "Naczepa (opcjonalnie)",
    driver: "Kierowca",
    vin: "VIN",
    vinInvalid: "Nieprawidłowy VIN: 17 znaków, bez I, O, Q",
    vinCheckWarn: "Cyfra kontrolna się nie zgadza (częste w VIN z UE) — sprawdź w dowodzie",
    km: "Przebieg (km)",
    dateTime: "Data i godzina",
    direction: "Kontrola",
    plecare: "Wyjazd",
    intoarcere: "Powrót",
    checklist: "Kontrole",
    item: {
      anvelope: "Opony",
      lumini: "Światła",
      frane: "Hamulce",
      scurgeri: "Wycieki (olej / paliwo / AdBlue)",
      incarcatura: "Ładunek / mocowanie",
      caroserie: "Uszkodzenia nadwozia",
      oglinzi: "Lusterka",
      stergatoare: "Wycieraczki",
      documente: "Dokumenty / tachograf",
      extinctor: "Gaśnica / apteczka",
    },
    status: { ok: "OK", defect: "Usterka", na: "N/D" },
    note: "Opis usterki",
    photo: "Zdjęcie",
    addPhoto: "Dodaj zdjęcie",
    removePhoto: "Usuń zdjęcie",
    model: "Marka / model",
    client: "Klient / przewoźnik",
    reclamatie: "Zgłoszenie",
    constatare: "Diagnoza",
    observatii: "Uwagi / wykonane prace",
    manopera: "Robocizna (godz.)",
    piese: "Części",
    place: "Miejsce",
    description: "Opis szkody",
    photos: "Zdjęcia",
    caption: "Opis zdjęcia",
    zones: "Uszkodzone strefy",
    zone: {
      fata: "Przód / zderzak",
      cabina_stanga: "Kabina lewa",
      cabina_dreapta: "Kabina prawa",
      acoperis: "Dach / owiewka",
      lateral_stanga: "Bok lewy",
      lateral_dreapta: "Bok prawy",
      spate: "Tył / drzwi",
      remorca: "Naczepa",
      roti: "Koła / felgi",
      parbriz: "Szyba / okna",
    },
    parties: "Strony zdarzenia",
    sigDriver: "Podpis kierowcy",
    sigTech: "Podpis serwisanta",
    sigClient: "Podpis klienta",
    sigReporter: "Podpis zgłaszającego",
    sigOther: "Podpis drugiej strony",
    history: "Historia pojazdu",
    historyEmpty: "Brak kart dla tego pojazdu.",
    trucks: "Ciężarówki",
    defects: "usterek",
    noDefects: "bez usterek",
    st: { sent: "Wysłana", signed: "Podpisana", draft: "Szkic" },
    fillTitle: "Uzupełnij głosem / tekstem",
    fillHint: "Np. „WA 12345, 452300 km, lewa przednia opona zużyta, wyciek oleju”",
    fillBtn: "Uzupełnij pola",
    fillBusy: "Uzupełnianie…",
    fillNone: "Nie znaleziono nic do uzupełnienia.",
    fillDone: "Uzupełniono pola oznaczone ✦ — sprawdź je przed podpisem.",
    reviewFirst: "Pola uzupełnione automatycznie: sprawdź i zapisz przed podpisem / PDF.",
    photoNote: "Zdjęcia są dołączane do karty (bez automatycznego odczytu tekstu).",
    pdfTitle: { check: "KONTROLA POJAZDU PRZEZ KIEROWCĘ", service: "KARTA DIAGNOZY / NAPRAWY CIĘŻARÓWKI", damage: "RAPORT SZKODY" },
    nr: "Nr",
    date: "Data",
    cod: "Kod",
    qty: "Il.",
    price: "Cena",
    total: "Suma części",
    footer: "Querra Fișă — wygenerowano na urządzeniu",
    plateInvalid: "Nietypowy format — sprawdź numer",
    labour: "Robocizna",
    labourDesc: "Czynność (np. diagnoza układu hamulcowego)",
    addLabour: "Dodaj robociznę",
    verify: "Sprawdziłem dane w karcie",
    verifiedBy: "Sprawdził",
    verifyNeeded: "Zaznacz „Sprawdziłem dane”, aby zapisać, utworzyć PDF i wysłać.",
    search: "Szukaj nr rej. lub VIN (np. WA12 lub 6 ostatnich znaków VIN)",
    openHistory: "Historia pojazdu",
    newTruck: "Nowa karta dla tego pojazdu",
  },
};

export function truckLabels(loc: string | null | undefined): TL {
  return TRUCK_LABELS[loc === "en" || loc === "pl" ? loc : "ro"];
}

/**
 * Schematic top view of a tractor + trailer (100 × 40 units, front on the
 * left). Shared by the on-screen picker (SVG) and the PDF drawing.
 */
export const ZONE_SHAPES: Record<DamageZone, [number, number, number, number][]> = {
  fata: [[0, 8, 4, 24]],
  parbriz: [[4, 8, 4, 24]],
  cabina_dreapta: [[8, 4, 16, 11]],
  acoperis: [[8, 15, 16, 10]],
  cabina_stanga: [[8, 25, 16, 11]],
  lateral_dreapta: [[25, 4, 35, 16]],
  lateral_stanga: [[25, 20, 35, 16]],
  remorca: [[61, 4, 33, 32]],
  spate: [[94, 8, 5, 24]],
  roti: [
    [12, 0, 7, 4], [12, 36, 7, 4],
    [44, 0, 7, 4], [44, 36, 7, 4],
    [70, 0, 7, 4], [70, 36, 7, 4],
    [82, 0, 7, 4], [82, 36, 7, 4],
  ],
};

/** Replace position 9 of a 17-char VIN with the correct ISO 3779 check digit. */
export function vinWithCheckDigit(vin17: string): string {
  const v = vin17.toUpperCase();
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    if (i === 8) continue;
    const c = v[i];
    sum += (/\d/.test(c) ? Number(c) : VIN_MAP[c]) * VIN_W[i];
  }
  const r = sum % 11;
  return v.slice(0, 8) + (r === 10 ? "X" : String(r)) + v.slice(9);
}

const SERVICE_KEYS = ["reclamatie", "observatii", "manoperaOre", "piese"] as const;

/**
 * Merge a voice/text fill into a truck fișă. Only empty fields are filled:
 * plate / VIN / km / checklist from the deterministic extractor; for service
 * sheets also complaint, work done, parts and labour from the LLM/heuristic
 * patch; for damage reports the dictation itself becomes the description.
 * Returns the keys filled (highlighted until edited; review is mandatory).
 */
export function applyTruckFill(
  fisa: Fisa,
  text: string,
  ex: TruckExtraction,
  patch: Partial<Fisa> = {}
): { fisa: Fisa; filled: string[] } {
  const t0 = fisa.truck as TruckData;
  const { truck, filled } = applyTruckExtraction(t0, ex);
  const next: Fisa = { ...fisa, truck };
  if (t0.kind === "service") {
    for (const k of SERVICE_KEYS) {
      if (k === "piese") {
        const have = fisa.piese.some((p) => p.denumire.trim());
        const got = (patch.piese || []).some((p) => p.denumire.trim());
        if (!have && got) {
          next.piese = patch.piese!;
          filled.push("piese");
        }
        continue;
      }
      const v = patch[k];
      if (typeof v === "string" && v.trim() && !String(fisa[k] || "").trim()) {
        next[k] = v;
        filled.push(k);
      }
    }
  }
  if (t0.kind === "damage" && !t0.description?.trim() && text.trim()) {
    next.truck = { ...next.truck!, description: text.trim() };
    filled.push("truck.description");
  }
  if (filled.length) {
    next.aiFilled = Array.from(new Set([...(fisa.aiFilled || []), ...filled]));
    next.reviewed = false;
    next.truck = { ...next.truck!, verifiedBy: undefined, verifiedAt: undefined };
  }
  return { fisa: next, filled };
}
