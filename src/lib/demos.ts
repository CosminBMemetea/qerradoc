import { emptyFisa, EMPTY_PIESE, type Fisa, type Piesa } from "./types";
import { saveFisa } from "./db";

function fillPiese(lines: Array<Partial<Piesa> & { denumire: string }>): Piesa[] {
  const piese = EMPTY_PIESE();
  lines.forEach((line, i) => {
    if (i >= piese.length) return;
    piese[i] = {
      nr: i + 1,
      denumire: line.denumire,
      cod: line.cod || "",
      cantitate: line.cantitate || "1",
      pretEur: line.pretEur || "",
    };
  });
  return piese;
}

/** 1) Utilaje curățenie — service sheet Kärcher/Nilfisk style */
export function buildDemoCuratenie(technicianName?: string): Fisa {
  return emptyFisa({
    tip: "Reparație",
    nrFisa: "UC-2026-0187",
    proprietar: "Hotel Belvedere Oradea SRL",
    client: "Hotel Belvedere — Departament Housekeeping",
    locatie: "Str. Primăriei 8, Oradea, Bihor (et. 2 depozit utilaje)",
    modelUtilaj: "Kärcher B 60 W Bp Pack Dose",
    serie: "1.384-020.0 / SN KB60-2024-88421",
    oreFunctionare: "1842",
    manoperaOre: "2.5",
    deplasareKm: "12",
    deplasareDaNu: "DA",
    reclamatie:
      "Aspirare slabă pe covor — aspiratorul nu mai trage praf fin. Operatorii raportează zgomot neobișnuit la peria cilindrică și miros de filtru ars după ~30 min. Solicitare intervenție urgentă înainte de weekend (ocupare hotel 92%).",
    piese: fillPiese([
      {
        denumire: "Filtru HEPA circular",
        cod: "6.414-631.0",
        cantitate: "1",
        pretEur: "48.50",
      },
      {
        denumire: "Perie cilindrică standard 60 cm",
        cod: "4.762-450.0",
        cantitate: "1",
        pretEur: "89.00",
      },
      {
        denumire: "Garnitură etanșare rezervor murdar",
        cod: "5.035-488.0",
        cantitate: "1",
        pretEur: "16.20",
      },
      {
        denumire: "Curea transmisie perie",
        cod: "6.666-017.0",
        cantitate: "1",
        pretEur: "22.00",
      },
    ]),
    dataAnuntarii: "2026-09-18",
    dataInterventiei: "2026-09-19",
    observatii:
      "Înlocuit HEPA + perie + curea. Test aspirare pe covor lână: OK. Instructaj operator: golire rezervor după fiecare tură, verificare filtru săptămânal. Următoarea revizie recomandată la 2000 ore.",
    motiveInlocuire:
      "Filtru HEPA colmatat (>90% saturat) — aspirare insuficientă. Perie uzată pe 40% din lungime, fire smulse. Curea fisurată — zgomot și pierdere cuplu.",
    semnaturaClient: "Ana Mureșan (Housekeeping Manager)",
    semnaturaTehnician: technicianName || "Mihai Popa",
    templateKind: "curatenie",
    reviewed: true,
  });
}

/** 2) Tâmplărie PVC/lemn — măsurători / montaj mapped into Fisa fields */
export function buildDemoTamplarie(technicianName?: string): Fisa {
  return emptyFisa({
    tip: "Punere în funcțiune",
    nrFisa: "TM-2026-0441",
    proprietar: "Popescu Construcții Bihor SRL",
    client: "Familia Ionescu (beneficiar final)",
    locatie: "Șantier: str. Traian Vuia 27A, Oradea, Bihor — casă P+M",
    modelUtilaj: "Tâmplărie PVC 5 camere — Salamander bluEvolution 82",
    serie: "Contract / comandă CMD-BH-2026-0892",
    oreFunctionare: "",
    manoperaOre: "6",
    deplasareKm: "18",
    deplasareDaNu: "DA",
    reclamatie:
      "MĂSURĂTORI GOLURI (L × H, tip deschidere, culoare, feronerie):\n" +
      "1) Living — 2100 × 1450 mm — basculantă+oscilantă (TBT) — alb RAL 9016 / interior stejar auriu — Maco Multi-Trend\n" +
      "2) Dormitor 1 — 1400 × 1450 mm — oscilo-batantă — aceeași culoare — Maco\n" +
      "3) Bucătărie — 1200 × 1350 mm — basculantă — alb — Maco\n" +
      "4) Baie — 600 × 900 mm — oscilo-batantă (fixizare) — alb — Maco\n" +
      "5) Ușă terasă — 2200 × 2100 mm — glisantă 2 canate — stejar auriu — Roto Patio",
    piese: fillPiese([
      {
        denumire: "Profil PVC Salamander 82 (ml)",
        cod: "SAL-82-W",
        cantitate: "38",
        pretEur: "12.40",
      },
      {
        denumire: "Sticlă termopan 4/16/4 Low-E Argon (m²)",
        cod: "GL-LE-4164",
        cantitate: "14.2",
        pretEur: "68.00",
      },
      {
        denumire: "Feronerie Maco Multi-Trend (set ferestre)",
        cod: "MACO-MT",
        cantitate: "4",
        pretEur: "95.00",
      },
      {
        denumire: "Feronerie Roto Patio (ușă glisantă)",
        cod: "ROTO-PAT",
        cantitate: "1",
        pretEur: "280.00",
      },
      {
        denumire: "Prag aluminiu + garnituri + ancore",
        cod: "ACC-SET",
        cantitate: "1",
        pretEur: "145.00",
      },
    ]),
    dataAnuntarii: "2026-09-10",
    dataInterventiei: "2026-09-21",
    observatii:
      "TERMENE MONTAJ: livrare profile 28.09, montaj pe șantier 02–03.10.2026.\n" +
      "COTE SPECIALE: buiandrug living +15 mm față de plan; pervaz exterior aluminiu anodizat pe toate ferestrele; buiandrug ușă terasă armat. Clientul confirmă culoare stejar auriu pe față interioară. Acces șantier cu autoutilitară OK.",
    motiveInlocuire: "",
    semnaturaClient: "Andrei Ionescu (beneficiar)",
    semnaturaTehnician: technicianName || "Cristian Sabău (montator)",
    templateKind: "tamplarie",
    reviewed: true,
  });
}

/** 3) Cabinet stomatologic — consimțământ / tratament mapped into Fisa fields */
export function buildDemoStoma(technicianName?: string): Fisa {
  return emptyFisa({
    tip: "Constatare",
    nrFisa: "ST-2026-3312",
    proprietar: "Cabinet Stomatologic Dr. Elena Varga",
    client: "Maria Pop (pacient)",
    locatie: "Cabinet: str. Independenței 14, Oradea — sala 2",
    modelUtilaj: "Tratament canal (endo) + coroană ceramică pe 26",
    serie: "Fișă pacient FP-2026-08841",
    oreFunctionare: "",
    manoperaOre: "1.5",
    deplasareKm: "0",
    deplasareDaNu: "NU",
    reclamatie:
      "ANAMNEZĂ / MOTIVE PREZENTARE:\n" +
      "Durere spontană nocturnă dinți laterali superiori stânga (~3 zile). Sensibilitate la rece și la apăsare. Fără alergii medicamentoase cunoscute. Nu fumează. Ultima radiografie OPG: 2025. Tensiune controlată (enalapril).",
    piese: fillPiese([
      {
        denumire: "Anestezie articaină 4% + epinefrină (carpule)",
        cod: "ANEST-ART",
        cantitate: "2",
        pretEur: "8.00",
      },
      {
        denumire: "Material endodontic gutapercă + sealer (canal 26)",
        cod: "ENDO-26",
        cantitate: "1",
        pretEur: "55.00",
      },
      {
        denumire: "Reconstituire coronală compozit fotopolimerizabil",
        cod: "COMP-COR",
        cantitate: "1",
        pretEur: "45.00",
      },
      {
        denumire: "Coroană ceramică E.max pe 26 (inclusiv laborator) — preț RON în denumire: ~1800 RON",
        cod: "CROWN-EMX",
        cantitate: "1",
        pretEur: "360.00",
      },
      {
        denumire: "Radiografie periapicală digitală",
        cod: "RX-PA",
        cantitate: "2",
        pretEur: "12.00",
      },
    ]),
    dataAnuntarii: "2026-09-20",
    dataInterventiei: "2026-09-21",
    observatii:
      "PLAN TRATAMENT: 1) Extirpare + tratament canal 26 (azi). 2) Reconstituire + preparație coronală. 3) Amprentă coroană — laborator 7–10 zile. 4) Cimentare definitivă.\n" +
      "RISCURI: sensibilitate post-operatorie 48–72h, posibilitate refractare canal, eșec endodontic rar, necesitate extracție/implant în caz de eșec.\n" +
      "CONSIMȚĂMÂNT: Pacientul a fost informat despre diagnostic, alternativă (extracție), costuri estimate și riscuri; acceptă planul și semnează.",
    motiveInlocuire:
      "Țesut pulpar necrotic — indicație tratament endodontic; coroana clinică distrusă >50% — indicație coroană de acoperire.",
    semnaturaClient: "Maria Pop (pacient)",
    semnaturaTehnician: technicianName || "Dr. Elena Varga",
    templateKind: "stoma",
    reviewed: true,
  });
}

export async function seedDemoCuratenie(technicianName?: string) {
  const fisa = buildDemoCuratenie(technicianName);
  await saveFisa(fisa);
  return fisa;
}

export async function seedDemoTamplarie(technicianName?: string) {
  const fisa = buildDemoTamplarie(technicianName);
  await saveFisa(fisa);
  return fisa;
}

export async function seedDemoStoma(technicianName?: string) {
  const fisa = buildDemoStoma(technicianName);
  await saveFisa(fisa);
  return fisa;
}
