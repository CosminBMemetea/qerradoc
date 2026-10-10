/**
 * Transport demo: fictional firm "TransBihor Logistic SRL" with 4 trucks,
 * drivers, a parts catalog and 9 RO demo fișe (3 per type) so the per-truck
 * history has content. Pure module (no IndexedDB) — used by the app's demo
 * button, scripts/make-transport-pack.mts and scripts/smoke-trucks.mts.
 * All names, plates and VINs are invented.
 */
import { EMPTY_PIESE, emptyFisa, type Fisa, type Piesa } from "./types";
import { emptyChecklist, emptyTruck, vinWithCheckDigit, type CatalogPart, type CatalogTruck, type CheckItemKey, type TruckData } from "./truck";
import {
  DEMO_IMG_MIRROR,
  DEMO_IMG_OIL,
  DEMO_IMG_REAR,
  DEMO_IMG_SIDE,
  DEMO_IMG_TYRE,
  DEMO_SIG_A,
  DEMO_SIG_B,
} from "./truck-demo-images";

export const TRANSPORT_FIRM = {
  companyName: "TransBihor Logistic SRL",
  cui: "RO41234567",
  address: "Oradea, Calea Borșului 42, Bihor",
  phone: "+40 259 000 222",
};
export const TRANSPORT_DRIVERS = ["Ioan Pop", "Florin Crișan", "Marius Bogdan", "Gheorghe Lazăr"];
export const TRANSPORT_TECHS = ["Adrian Bodea", "Călin Moldovan"];

const T0 = "2026-10-01T08:00:00.000Z";
export const TRANSPORT_TRUCKS: CatalogTruck[] = [
  { id: "tb-truck-1", plate: "BH 12 TBL", plateKey: "BH12TBL", vin: vinWithCheckDigit("YV2RT40A0KA812345"), model: "Volvo FH 500", clientName: TRANSPORT_FIRM.companyName, driver: "Ioan Pop", updatedAt: T0 },
  { id: "tb-truck-2", plate: "BH 34 TBL", plateKey: "BH34TBL", vin: vinWithCheckDigit("XLRTEH4300G456789"), model: "DAF XF 480", clientName: TRANSPORT_FIRM.companyName, driver: "Florin Crișan", updatedAt: T0 },
  { id: "tb-truck-3", plate: "BH 56 TBL", plateKey: "BH56TBL", vin: vinWithCheckDigit("WDB96340310234567"), model: "Mercedes-Benz Actros 1845", clientName: TRANSPORT_FIRM.companyName, driver: "Marius Bogdan", updatedAt: T0 },
  { id: "tb-truck-4", plate: "CJ 07 TBL", plateKey: "CJ07TBL", vin: vinWithCheckDigit("YS2R4X20005398765"), model: "Scania R 450", clientName: TRANSPORT_FIRM.companyName, driver: "Gheorghe Lazăr", updatedAt: T0 },
];

export const TRANSPORT_PARTS: CatalogPart[] = [
  { denumire: "Anvelopă 315/70 R22.5 direcție", cod: "MICH-315-70-XZA", pret: "2150" },
  { denumire: "Plăcuțe frână față (set)", cod: "BPW-0980106430", pret: "890" },
  { denumire: "Disc frână", cod: "SAF-3057002900", pret: "1240" },
  { denumire: "Simering ax spate", cod: "VOL-20797548", pret: "185" },
  { denumire: "Senzor NOx AdBlue", cod: "SCA-2296799", pret: "1650" },
  { denumire: "Oglindă retrovizoare dreapta", cod: "MB-A9608100516", pret: "980" },
  { denumire: "Bec far H7 24V", cod: "OSR-64215", pret: "35" },
  { denumire: "Lamelă ștergător 650 mm", cod: "BOS-3397018965", pret: "75" },
  { denumire: "Filtru ulei motor", cod: "MANN-HU1381X", pret: "160" },
  { denumire: "Ulei motor 10W-40 (litru)", cod: "TOT-RUBIA-10W40", pret: "32" },
];

function truckOf(i: number): CatalogTruck {
  return TRANSPORT_TRUCKS[i];
}

function piese(lines: Array<Omit<Piesa, "nr">>): Piesa[] {
  const p = EMPTY_PIESE();
  lines.forEach((l, i) => (p[i] = { nr: i + 1, ...l }));
  return p;
}

function checklist(defects: Partial<Record<CheckItemKey, { note: string; photo?: string }>>, na: CheckItemKey[] = []) {
  return emptyChecklist().map((c) => {
    const d = defects[c.key];
    if (d) return { key: c.key, status: "defect" as const, note: d.note, photoDataUrl: d.photo };
    return { key: c.key, status: na.includes(c.key) ? ("na" as const) : ("ok" as const) };
  });
}

function base(id: string, nr: string, dateTime: string, truck: Partial<TruckData> & Pick<TruckData, "kind">, extra: Partial<Fisa> = {}): Fisa {
  const day = dateTime.slice(0, 10);
  return emptyFisa({
    id,
    nrFisa: nr,
    tip: truck.kind === "service" ? "Reparație" : "Constatare",
    client: TRANSPORT_FIRM.companyName,
    dataInterventiei: day,
    contentLocale: "ro",
    currency: "RON",
    reviewed: true,
    createdAt: `${day}T10:00:00.000Z`,
    updatedAt: `${day}T10:00:00.000Z`,
    truck: emptyTruck(truck.kind, { dateTime, ...truck }),
    ...extra,
  });
}

/** 9 demo fișe (RO): 3 driver checks, 3 service sheets, 3 damage reports. */
export function buildTransportDemoFise(): Fisa[] {
  const [a, b, c, d] = [truckOf(0), truckOf(1), truckOf(2), truckOf(3)];
  const id = (t: CatalogTruck) => ({ plate: t.plate, vin: t.vin, model: t.model, driver: t.driver });
  return [
    // —— a) Verificare șofer ——
    base("demo-truck-check-1", "VS-2026-0141", "2026-10-05T07:10", {
      kind: "check", ...id(a), trailer: "BH 13 TBR", km: "452300", direction: "plecare",
      checklist: checklist({
        anvelope: { note: "Anvelopa stânga față uzată, sub 3 mm pe umăr", photo: DEMO_IMG_TYRE },
        scurgeri: { note: "Pierde ulei la butucul punții spate (pată sub camion)", photo: DEMO_IMG_OIL },
      }),
    }, {
      observatii: "Plecare amânată 2 h; camionul trimis la service (fișa SC-2026-0212).",
      semnaturaClient: "Ioan Pop", semnaturaClientDataUrl: DEMO_SIG_A, sentAt: "2026-10-05T05:30:00.000Z",
    }),
    base("demo-truck-check-2", "VS-2026-0157", "2026-10-07T18:40", {
      kind: "check", ...id(a), trailer: "BH 13 TBR", km: "453120", direction: "intoarcere",
      checklist: checklist({}, ["extinctor"]),
    }, { observatii: "Întoarcere Arad – Oradea fără probleme.", semnaturaClient: "Ioan Pop", semnaturaClientDataUrl: DEMO_SIG_A }),
    base("demo-truck-check-3", "VS-2026-0163", "2026-10-08T06:30", {
      kind: "check", ...id(c), trailer: "BH 57 TBR", km: "318760", direction: "plecare",
      checklist: checklist({
        oglinzi: { note: "Oglinda dreapta spartă (lovită în parcare)", photo: DEMO_IMG_MIRROR },
        extinctor: { note: "Extinctor expirat 09/2026" },
      }),
    }, { semnaturaClient: "Marius Bogdan" }),

    // —— b) Constatare / reparație service ——
    base("demo-truck-service-1", "SC-2026-0212", "2026-10-06T09:00", {
      kind: "service", ...id(a), km: "452410",
      constatare: "Anvelopă direcție stânga uzată neuniform (geometrie). Simering butuc punte spate stânga neetanș, ulei pe sabot.",
    }, {
      reclamatie: "Șoferul a raportat anvelopă uzată și pierdere de ulei la verificarea de plecare (VS-2026-0141).",
      piese: piese([
        { denumire: "Anvelopă 315/70 R22.5 direcție", cod: "MICH-315-70-XZA", cantitate: "1", pretEur: "2150" },
        { denumire: "Simering ax spate", cod: "VOL-20797548", cantitate: "1", pretEur: "185" },
        { denumire: "Ulei motor 10W-40 (litru)", cod: "TOT-RUBIA-10W40", cantitate: "2", pretEur: "32" },
      ]),
      manoperaOre: "3.5",
      observatii: "Înlocuit anvelopa și simeringul, completat ulei punte, verificat geometria. Test drum 10 km OK.",
      semnaturaTehnician: "Adrian Bodea", semnaturaTehnicianDataUrl: DEMO_SIG_B,
      semnaturaClient: "Ioan Pop", semnaturaClientDataUrl: DEMO_SIG_A, sentAt: "2026-10-06T13:10:00.000Z",
    }),
    base("demo-truck-service-2", "SC-2026-0198", "2026-09-28T10:30", {
      kind: "service", ...id(b), km: "611870",
      constatare: "Plăcuțe frână față la limită (4 mm), disc dreapta cu canale.",
    }, {
      reclamatie: "Zgomot metalic la frânare, vibrații în pedală.",
      piese: piese([
        { denumire: "Plăcuțe frână față (set)", cod: "BPW-0980106430", cantitate: "1", pretEur: "890" },
        { denumire: "Disc frână", cod: "SAF-3057002900", cantitate: "1", pretEur: "1240" },
      ]),
      manoperaOre: "2.5",
      observatii: "Înlocuit plăcuțe față și disc dreapta. Recomandat disc stânga la următoarea revizie.",
      semnaturaTehnician: "Călin Moldovan", semnaturaTehnicianDataUrl: DEMO_SIG_B,
      semnaturaClient: "Florin Crișan", semnaturaClientDataUrl: DEMO_SIG_A,
    }),
    base("demo-truck-service-3", "SC-2026-0205", "2026-10-02T14:00", {
      kind: "service", ...id(d), km: "287430",
      constatare: "Eroare senzor NOx după catalizator; nivel AdBlue OK.",
    }, {
      reclamatie: "Martor motor aprins, putere redusă (mod avarie).",
      piese: piese([{ denumire: "Senzor NOx AdBlue", cod: "SCA-2296799", cantitate: "1", pretEur: "1650" }]),
      manoperaOre: "1.5",
      observatii: "Înlocuit senzorul NOx, șters erorile, test 20 min fără eroare.",
      semnaturaTehnician: "Adrian Bodea",
    }),

    // —— c) Raport de daună ——
    base("demo-truck-damage-1", "RD-2026-0031", "2026-10-03T16:20", {
      kind: "damage", ...id(b), trailer: "BH 35 TBR", km: "612040",
      place: "Rampa de descărcare, Parc Industrial Eurobusiness II, Oradea",
      description: "La manevra cu spatele, lateralul dreapta al semiremorcii a atins stâlpul rampei. Prelata ruptă ~40 cm, montant îndoit.",
      zones: ["lateral_dreapta", "remorca"],
      parties: "Șofer Florin Crișan (TransBihor); gestionar rampă: Dan Ilieș (Eurobusiness Logistic)",
      photos: [
        { dataUrl: DEMO_IMG_SIDE, caption: "Lateral dreapta semiremorcă — zona lovită" },
        { dataUrl: DEMO_IMG_REAR, caption: "Vedere de ansamblu spate" },
      ],
    }, {
      semnaturaTehnician: "Florin Crișan", semnaturaTehnicianDataUrl: DEMO_SIG_A,
      semnaturaClient: "Dan Ilieș", semnaturaClientDataUrl: DEMO_SIG_B,
    }),
    base("demo-truck-damage-2", "RD-2026-0034", "2026-10-08T06:15", {
      kind: "damage", ...id(c), km: "318760",
      place: "Parcare TIR, DN79 km 3, Oradea",
      description: "Oglinda dreapta găsită spartă la preluarea camionului; posibil lovită de alt vehicul în timpul nopții.",
      zones: ["cabina_dreapta"],
      parties: "Șofer Marius Bogdan; autor necunoscut",
      photos: [{ dataUrl: DEMO_IMG_MIRROR, caption: "Oglinda dreapta — carcasă și sticlă sparte" }],
    }, { semnaturaTehnician: "Marius Bogdan", semnaturaTehnicianDataUrl: DEMO_SIG_A }),
    base("demo-truck-damage-3", "RD-2026-0027", "2026-09-20T11:45", {
      kind: "damage", ...id(a), trailer: "BH 13 TBR", km: "448900",
      place: "Depozit client, Arad, str. Poetului 10",
      description: "Ușa spate stânga a semiremorcii îndoită de stivuitorul clientului la încărcare.",
      zones: ["spate", "remorca"],
      parties: "Șofer Ioan Pop; operator stivuitor (client) — Vasile Toma",
      photos: [{ dataUrl: DEMO_IMG_REAR, caption: "Ușa spate stânga îndoită" }],
    }, {
      semnaturaTehnician: "Ioan Pop", semnaturaTehnicianDataUrl: DEMO_SIG_A,
      semnaturaClient: "Vasile Toma", semnaturaClientDataUrl: DEMO_SIG_B, sentAt: "2026-09-20T10:30:00.000Z",
    }),
  ];
}
