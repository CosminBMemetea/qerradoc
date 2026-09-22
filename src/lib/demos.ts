import { emptyFisa, EMPTY_PIESE, type Fisa, type Piesa, type TemplateKind } from "./types";
import { saveFisa } from "./db";

export type DemoLocale = "ro" | "en" | "pl";

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

/** 1) Cleaning / utilaje curățenie — RO */
function buildDemoCuratenieRo(technicianName?: string): Fisa {
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
      { denumire: "Filtru HEPA circular", cod: "6.414-631.0", cantitate: "1", pretEur: "48.50" },
      { denumire: "Perie cilindrică standard 60 cm", cod: "4.762-450.0", cantitate: "1", pretEur: "89.00" },
      { denumire: "Garnitură etanșare rezervor murdar", cod: "5.035-488.0", cantitate: "1", pretEur: "16.20" },
      { denumire: "Curea transmisie perie", cod: "6.666-017.0", cantitate: "1", pretEur: "22.00" },
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

/** England — Manchester commercial cleaner, Nilfisk */
function buildDemoCuratenieEn(technicianName?: string): Fisa {
  return emptyFisa({
    tip: "Reparație",
    nrFisa: "CL-2026-0187",
    proprietar: "Northern Facilities Ltd",
    client: "CityGate Business Centre — Soft Services",
    locatie: "Deansgate 120, Manchester M3 2GA (basement plant room)",
    modelUtilaj: "Nilfisk SC500 53 B Full Traction",
    serie: "908 7341 010 / SN NF-SC500-2024-55102",
    oreFunctionare: "2105",
    manoperaOre: "2.5",
    deplasareKm: "14",
    deplasareDaNu: "DA",
    reclamatie:
      "Poor suction on carpet — machine no longer picks up fine dust. Operators report unusual noise from the cylindrical brush and a burnt-filter smell after ~30 min. Urgent call-out requested before weekend (building occupancy high).",
    piese: fillPiese([
      { denumire: "HEPA circular filter", cod: "6.414-631.0", cantitate: "1", pretEur: "42.00" },
      { denumire: "Cylindrical brush standard 53 cm", cod: "4.762-450.0", cantitate: "1", pretEur: "78.00" },
      { denumire: "Dirty-water tank seal", cod: "5.035-488.0", cantitate: "1", pretEur: "14.50" },
      { denumire: "Brush drive belt (~£18)", cod: "6.666-017.0", cantitate: "1", pretEur: "18.00" },
    ]),
    dataAnuntarii: "2026-09-18",
    dataInterventiei: "2026-09-19",
    observatii:
      "Replaced HEPA + brush + belt. Carpet suction test: OK. Operator briefing: empty tank after each shift, check filter weekly. Next service recommended at 2200 hours.",
    motiveInlocuire:
      "HEPA filter clogged (>90% saturated) — insufficient suction. Brush worn on 40% of length, bristles pulled. Cracked belt — noise and torque loss.",
    semnaturaClient: "James Hartley (Facilities Supervisor)",
    semnaturaTehnician: technicianName || "Tom Bradley",
    templateKind: "curatenie",
    reviewed: true,
  });
}

/** Poland — Wrocław firma sprzątająca, Kärcher */
function buildDemoCurateniePl(technicianName?: string): Fisa {
  return emptyFisa({
    tip: "Reparație",
    nrFisa: "CZ-2026-0187",
    proprietar: "CleanPro Wrocław Sp. z o.o.",
    client: "Hotel Piast — Dział Housekeeping",
    locatie: "ul. Świdnicka 15, Wrocław (magazyn sprzętu, poziom -1)",
    modelUtilaj: "Kärcher B 60 W Bp Pack Dose",
    serie: "1.384-020.0 / SN KB60-2024-77103",
    oreFunctionare: "1760",
    manoperaOre: "2.5",
    deplasareKm: "9",
    deplasareDaNu: "DA",
    reclamatie:
      "Słabe ssanie na dywanie — maszyna nie zbiera już drobnego pyłu. Operatorzy zgłaszają nietypowy hałas przy szczotce cylindrycznej i zapach spalonego filtra po ~30 min. Pilna interwencja przed weekendem (obłożenie hotelu 90%).",
    piese: fillPiese([
      { denumire: "Filtr HEPA okrągły", cod: "6.414-631.0", cantitate: "1", pretEur: "195.00" },
      { denumire: "Szczotka cylindryczna standard 60 cm", cod: "4.762-450.0", cantitate: "1", pretEur: "360.00" },
      { denumire: "Uszczelka zbiornika brudnej wody", cod: "5.035-488.0", cantitate: "1", pretEur: "65.00" },
      { denumire: "Pasek napędu szczotki (~89 PLN)", cod: "6.666-017.0", cantitate: "1", pretEur: "89.00" },
    ]),
    dataAnuntarii: "2026-09-18",
    dataInterventiei: "2026-09-19",
    observatii:
      "Wymieniono HEPA + szczotkę + pasek. Test ssania na dywanie: OK. Instruktaż: opróżniać zbiornik po każdej zmianie, sprawdzać filtr co tydzień. Następny przegląd zalecany przy 2000 h.",
    motiveInlocuire:
      "Filtr HEPA zatkany (>90% nasycenia) — niedostateczne ssanie. Szczotka zużyta na 40% długości. Pęknięty pasek — hałas i utrata momentu.",
    semnaturaClient: "Anna Kowalska (Kierownik Housekeeping)",
    semnaturaTehnician: technicianName || "Piotr Nowak",
    templateKind: "curatenie",
    reviewed: true,
  });
}

/** 2) Carpentry — RO Oradea */
function buildDemoTamplarieRo(technicianName?: string): Fisa {
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
      { denumire: "Profil PVC Salamander 82 (ml)", cod: "SAL-82-W", cantitate: "38", pretEur: "12.40" },
      { denumire: "Sticlă termopan 4/16/4 Low-E Argon (m²)", cod: "GL-LE-4164", cantitate: "14.2", pretEur: "68.00" },
      { denumire: "Feronerie Maco Multi-Trend (set ferestre)", cod: "MACO-MT", cantitate: "4", pretEur: "95.00" },
      { denumire: "Feronerie Roto Patio (ușă glisantă)", cod: "ROTO-PAT", cantitate: "1", pretEur: "280.00" },
      { denumire: "Prag aluminiu + garnituri + ancore", cod: "ACC-SET", cantitate: "1", pretEur: "145.00" },
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

/** England — Leeds uPVC windows */
function buildDemoTamplarieEn(technicianName?: string): Fisa {
  return emptyFisa({
    tip: "Punere în funcțiune",
    nrFisa: "JN-2026-0441",
    proprietar: "Yorkshire Window Co Ltd",
    client: "Mr & Mrs Clarke (homeowner)",
    locatie: "Site: 14 Headingley Lane, Leeds LS6 2AS — semi-detached house",
    modelUtilaj: "uPVC 5-chamber — VEKA Softline 82",
    serie: "Order / contract ORD-LS-2026-0892",
    oreFunctionare: "",
    manoperaOre: "6",
    deplasareKm: "11",
    deplasareDaNu: "DA",
    reclamatie:
      "OPENING SURVEY (W × H, opening type, colour, hardware):\n" +
      "1) Lounge — 2100 × 1450 mm — tilt & turn — white RAL 9016 / oak foil inside — Roto NT\n" +
      "2) Bedroom 1 — 1400 × 1450 mm — tilt & turn — same colour — Roto NT\n" +
      "3) Kitchen — 1200 × 1350 mm — top-hung — white — Roto NT\n" +
      "4) Bathroom — 600 × 900 mm — tilt & turn (obscure glass) — white — Roto NT\n" +
      "5) Patio door — 2200 × 2100 mm — 2-sash sliding — oak foil — Roto Patio",
    piese: fillPiese([
      { denumire: "VEKA Softline 82 profile (lm)", cod: "VEKA-82-W", cantitate: "38", pretEur: "11.50" },
      { denumire: "Double glazing 4/16/4 Low-E Argon (m²)", cod: "GL-LE-4164", cantitate: "14.2", pretEur: "62.00" },
      { denumire: "Roto NT hardware (window set)", cod: "ROTO-NT", cantitate: "4", pretEur: "88.00" },
      { denumire: "Roto Patio hardware (sliding door)", cod: "ROTO-PAT", cantitate: "1", pretEur: "260.00" },
      { denumire: "Aluminium sill + seals + anchors (~£120)", cod: "ACC-SET", cantitate: "1", pretEur: "120.00" },
    ]),
    dataAnuntarii: "2026-09-10",
    dataInterventiei: "2026-09-21",
    observatii:
      "INSTALL DATES: profile delivery 28 Sep, on-site fit 2–3 Oct 2026.\n" +
      "SPECIAL NOTES: lounge lintel +15 mm vs drawing; anodised aluminium external sills on all windows; reinforced patio door lintel. Client confirms oak foil on internal face. Van access OK.",
    motiveInlocuire: "",
    semnaturaClient: "David Clarke (homeowner)",
    semnaturaTehnician: technicianName || "Mark Sullivan (fitter)",
    templateKind: "tamplarie",
    reviewed: true,
  });
}

/** Poland — Poznań stolarka */
function buildDemoTamplariePl(technicianName?: string): Fisa {
  return emptyFisa({
    tip: "Punere în funcțiune",
    nrFisa: "ST-2026-0441",
    proprietar: "OknaPoznań Sp. z o.o.",
    client: "Rodzina Wiśniewscy (inwestor)",
    locatie: "Budowa: ul. Grunwaldzka 88, Poznań — dom jednorodzinny",
    modelUtilaj: "Stolarka PVC 5-komorowa — Salamander bluEvolution 82",
    serie: "Umowa / zlecenie ZL-POZ-2026-0892",
    oreFunctionare: "",
    manoperaOre: "6",
    deplasareKm: "16",
    deplasareDaNu: "DA",
    reclamatie:
      "POMIARY OTWORÓW (szer. × wys., typ otwierania, kolor, okucia):\n" +
      "1) Salon — 2100 × 1450 mm — uchylno-rozwierana — biały RAL 9016 / dąb złoty wewnątrz — Maco Multi-Trend\n" +
      "2) Sypialnia 1 — 1400 × 1450 mm — uchylno-rozwierana — ten sam kolor — Maco\n" +
      "3) Kuchnia — 1200 × 1350 mm — uchylna — biały — Maco\n" +
      "4) Łazienka — 600 × 900 mm — uchylno-rozwierana (matowa) — biały — Maco\n" +
      "5) Drzwi tarasowe — 2200 × 2100 mm — przesuwne 2-skrzydłowe — dąb złoty — Roto Patio",
    piese: fillPiese([
      { denumire: "Profil PVC Salamander 82 (mb)", cod: "SAL-82-W", cantitate: "38", pretEur: "52.00" },
      { denumire: "Szyba zespolona 4/16/4 Low-E Argon (m²)", cod: "GL-LE-4164", cantitate: "14.2", pretEur: "285.00" },
      { denumire: "Okucia Maco Multi-Trend (komplet okien)", cod: "MACO-MT", cantitate: "4", pretEur: "400.00" },
      { denumire: "Okucia Roto Patio (drzwi przesuwne)", cod: "ROTO-PAT", cantitate: "1", pretEur: "1180.00" },
      { denumire: "Próg aluminiowy + uszczelki + kotwy (~610 PLN)", cod: "ACC-SET", cantitate: "1", pretEur: "610.00" },
    ]),
    dataAnuntarii: "2026-09-10",
    dataInterventiei: "2026-09-21",
    observatii:
      "TERMINY MONTAŻU: dostawa profili 28.09, montaż na budowie 02–03.10.2026.\n" +
      "UWAGI: nadproże salonu +15 mm względem projektu; parapety zewnętrzne aluminiowe anodowane na wszystkich oknach; wzmocnione nadproże drzwi tarasowych. Klient potwierdza dąb złoty od wewnątrz. Dostęp busem OK.",
    motiveInlocuire: "",
    semnaturaClient: "Marek Wiśniewski (inwestor)",
    semnaturaTehnician: technicianName || "Tomasz Zieliński (monter)",
    templateKind: "tamplarie",
    reviewed: true,
  });
}

/** 3) Dental — RO */
function buildDemoStomaRo(technicianName?: string): Fisa {
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
      { denumire: "Anestezie articaină 4% + epinefrină (carpule)", cod: "ANEST-ART", cantitate: "2", pretEur: "8.00" },
      { denumire: "Material endodontic gutapercă + sealer (canal 26)", cod: "ENDO-26", cantitate: "1", pretEur: "55.00" },
      { denumire: "Reconstituire coronală compozit fotopolimerizabil", cod: "COMP-COR", cantitate: "1", pretEur: "45.00" },
      {
        denumire: "Coroană ceramică E.max pe 26 (inclusiv laborator) — ~1800 RON",
        cod: "CROWN-EMX",
        cantitate: "1",
        pretEur: "360.00",
      },
      { denumire: "Radiografie periapicală digitală", cod: "RX-PA", cantitate: "2", pretEur: "12.00" },
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

/** UK dental practice */
function buildDemoStomaEn(technicianName?: string): Fisa {
  return emptyFisa({
    tip: "Constatare",
    nrFisa: "DN-2026-3312",
    proprietar: "SmileCare Dental Practice — Dr Helen Marsh",
    client: "Sarah Bennett (patient)",
    locatie: "Practice: 22 New Street, Birmingham B2 4DU — surgery 2",
    modelUtilaj: "Root canal treatment (endo) + ceramic crown on UR6",
    serie: "Patient record PR-2026-08841",
    oreFunctionare: "",
    manoperaOre: "1.5",
    deplasareKm: "0",
    deplasareDaNu: "NU",
    reclamatie:
      "HISTORY / PRESENTING COMPLAINT:\n" +
      "Spontaneous night pain upper right posterior teeth (~3 days). Sensitivity to cold and biting. No known drug allergies. Non-smoker. Last OPG: 2025. BP controlled (enalapril).",
    piese: fillPiese([
      { denumire: "Articaine 4% + epinephrine (cartridges)", cod: "ANEST-ART", cantitate: "2", pretEur: "7.00" },
      { denumire: "Endodontic gutta-percha + sealer (UR6 canal)", cod: "ENDO-UR6", cantitate: "1", pretEur: "48.00" },
      { denumire: "Composite core build-up (light-cured)", cod: "COMP-COR", cantitate: "1", pretEur: "40.00" },
      {
        denumire: "E.max ceramic crown UR6 (incl. lab) — ~£450",
        cod: "CROWN-EMX",
        cantitate: "1",
        pretEur: "450.00",
      },
      { denumire: "Digital periapical radiograph", cod: "RX-PA", cantitate: "2", pretEur: "15.00" },
    ]),
    dataAnuntarii: "2026-09-20",
    dataInterventiei: "2026-09-21",
    observatii:
      "TREATMENT PLAN: 1) Extirpation + root canal UR6 (today). 2) Core build-up + crown prep. 3) Crown impression — lab 7–10 days. 4) Definitive cementation.\n" +
      "RISKS: post-op sensitivity 48–72h, possible canal re-treatment, rare endodontic failure, extraction/implant if failure.\n" +
      "CONSENT: Patient informed of diagnosis, alternative (extraction), estimated costs and risks; accepts plan and signs.",
    motiveInlocuire:
      "Necrotic pulp tissue — indication for root canal; clinical crown destroyed >50% — indication for full-coverage crown.",
    semnaturaClient: "Sarah Bennett (patient)",
    semnaturaTehnician: technicianName || "Dr Helen Marsh",
    templateKind: "stoma",
    reviewed: true,
  });
}

/** Poland — gabinet stomatologiczny */
function buildDemoStomaPl(technicianName?: string): Fisa {
  return emptyFisa({
    tip: "Constatare",
    nrFisa: "GS-2026-3312",
    proprietar: "Gabinet Stomatologiczny dr Anna Lewandowska",
    client: "Katarzyna Nowak (pacjentka)",
    locatie: "Gabinet: ul. Floriańska 22, Kraków — gabinet 2",
    modelUtilaj: "Leczenie kanałowe (endo) + korona ceramiczna na ząb 26",
    serie: "Karta pacjenta KP-2026-08841",
    oreFunctionare: "",
    manoperaOre: "1.5",
    deplasareKm: "0",
    deplasareDaNu: "NU",
    reclamatie:
      "WYWIAD / POWÓD ZGŁOSZENIA:\n" +
      "Samoczynny ból nocny zębów bocznych górnych lewych (~3 dni). Wrażliwość na zimno i nagryzanie. Brak znanych alergii lekowych. Nie pali. Ostatnie OPG: 2025. Ciśnienie kontrolowane (enalapril).",
    piese: fillPiese([
      { denumire: "Znieczulenie artykaina 4% + epinefryna (ampułki)", cod: "ANEST-ART", cantitate: "2", pretEur: "35.00" },
      { denumire: "Materiał endodontyczny gutaperka + sealer (kanał 26)", cod: "ENDO-26", cantitate: "1", pretEur: "230.00" },
      { denumire: "Odbudowa koronowa kompozyt światłoutwardzalny", cod: "COMP-COR", cantitate: "1", pretEur: "190.00" },
      {
        denumire: "Korona ceramiczna E.max na 26 (z lab.) — ~1800 PLN",
        cod: "CROWN-EMX",
        cantitate: "1",
        pretEur: "1800.00",
      },
      { denumire: "Zdjęcie rtg okołowierzchołkowe cyfrowe", cod: "RX-PA", cantitate: "2", pretEur: "50.00" },
    ]),
    dataAnuntarii: "2026-09-20",
    dataInterventiei: "2026-09-21",
    observatii:
      "PLAN LECZENIA: 1) Ekstyrpacja + leczenie kanałowe 26 (dziś). 2) Odbudowa + preparacja koronowa. 3) Wycisk korony — laboratorium 7–10 dni. 4) Cementowanie ostateczne.\n" +
      "RYZYKA: nadwrażliwość po zabiegu 48–72h, możliwość powtórnego leczenia kanału, rzadka niepowodzenie endo, konieczność ekstrakcji/implantu przy niepowodzeniu.\n" +
      "ZGODA: Pacjentka poinformowana o rozpoznaniu, alternatywie (ekstrakcja), szacunkowych kosztach i ryzyku; akceptuje plan i podpisuje.",
    motiveInlocuire:
      "Martwica miazgi — wskazanie do leczenia endodontycznego; korona kliniczna zniszczona >50% — wskazanie do korony ochronnej.",
    semnaturaClient: "Katarzyna Nowak (pacjentka)",
    semnaturaTehnician: technicianName || "dr Anna Lewandowska",
    templateKind: "stoma",
    reviewed: true,
  });
}

const BUILDERS: Record<
  TemplateKind,
  Record<DemoLocale, (tech?: string) => Fisa>
> = {
  curatenie: {
    ro: buildDemoCuratenieRo,
    en: buildDemoCuratenieEn,
    pl: buildDemoCurateniePl,
  },
  tamplarie: {
    ro: buildDemoTamplarieRo,
    en: buildDemoTamplarieEn,
    pl: buildDemoTamplariePl,
  },
  stoma: {
    ro: buildDemoStomaRo,
    en: buildDemoStomaEn,
    pl: buildDemoStomaPl,
  },
};

/** Build a demo fișă for industry + locale (content language). */
export function buildDemo(
  kind: TemplateKind,
  locale: DemoLocale = "ro",
  technicianName?: string
): Fisa {
  const byLocale = BUILDERS[kind];
  const builder = byLocale[locale] || byLocale.ro;
  return builder(technicianName);
}

/** Persist a locale-aware demo. Prefer this from the list page. */
export async function loadDemo(
  kind: TemplateKind,
  locale: DemoLocale = "ro",
  technicianName?: string
): Promise<Fisa> {
  const fisa = buildDemo(kind, locale, technicianName);
  await saveFisa(fisa);
  return fisa;
}

/** @deprecated Prefer buildDemo(kind, locale, tech) */
export function buildDemoCuratenie(technicianName?: string): Fisa {
  return buildDemo("curatenie", "ro", technicianName);
}
/** @deprecated Prefer buildDemo(kind, locale, tech) */
export function buildDemoTamplarie(technicianName?: string): Fisa {
  return buildDemo("tamplarie", "ro", technicianName);
}
/** @deprecated Prefer buildDemo(kind, locale, tech) */
export function buildDemoStoma(technicianName?: string): Fisa {
  return buildDemo("stoma", "ro", technicianName);
}

export async function seedDemoCuratenie(technicianName?: string) {
  return loadDemo("curatenie", "ro", technicianName);
}
export async function seedDemoTamplarie(technicianName?: string) {
  return loadDemo("tamplarie", "ro", technicianName);
}
export async function seedDemoStoma(technicianName?: string) {
  return loadDemo("stoma", "ro", technicianName);
}
