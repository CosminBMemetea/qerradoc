import type { ContentLocale, TipFisa } from "./types";

/** Summary-card labels locked to fișă contentLocale (not UI Settings language). */
export type DocSummaryLabels = {
  fisaOf: string;
  nr: string;
  client: string;
  locatie: string;
  utilaj: string;
  manopera: string;
  deplasare: string;
  reclamatie: string;
  piese: string;
  pieseLines: string;
  currency: string;
  yes: string;
  no: string;
  clientSig: string;
  techSig: string;
  tip: Record<TipFisa, string>;
};

const DOC_LABELS: Record<ContentLocale, DocSummaryLabels> = {
  ro: {
    fisaOf: "Fișă de",
    nr: "Nr.",
    client: "Client:",
    locatie: "Locație:",
    utilaj: "Utilaj:",
    manopera: "Manoperă:",
    deplasare: "Deplasare:",
    reclamatie: "Reclamație:",
    piese: "Piese:",
    pieseLines: "linii",
    currency: "Monedă:",
    yes: "DA",
    no: "NU",
    clientSig: "Semnătură client:",
    techSig: "Semnătură tehnician:",
    tip: {
      Constatare: "Constatare",
      "Reparație": "Reparație",
      Revizie: "Revizie",
      "Punere în funcțiune": "Punere în funcțiune",
    },
  },
  en: {
    fisaOf: "Sheet of",
    nr: "No.",
    client: "Client:",
    locatie: "Location:",
    utilaj: "Machine:",
    manopera: "Labour:",
    deplasare: "Travel:",
    reclamatie: "Complaint:",
    piese: "Parts:",
    pieseLines: "lines",
    currency: "Currency:",
    yes: "YES",
    no: "NO",
    clientSig: "Client signature:",
    techSig: "Technician signature:",
    tip: {
      Constatare: "Inspection",
      "Reparație": "Repair",
      Revizie: "Service",
      "Punere în funcțiune": "Commissioning",
    },
  },
  pl: {
    fisaOf: "Karta",
    nr: "Nr",
    client: "Klient:",
    locatie: "Lokalizacja:",
    utilaj: "Maszyna:",
    manopera: "Robocizna:",
    deplasare: "Dojazd:",
    reclamatie: "Reklamacja:",
    piese: "Części:",
    pieseLines: "pozycji",
    currency: "Waluta:",
    yes: "TAK",
    no: "NIE",
    clientSig: "Podpis klienta:",
    techSig: "Podpis technika:",
    tip: {
      Constatare: "Ekspertyza",
      "Reparație": "Naprawa",
      Revizie: "Przegląd",
      "Punere în funcțiune": "Uruchomienie",
    },
  },
};

export function docLabels(contentLocale: ContentLocale): DocSummaryLabels {
  return DOC_LABELS[contentLocale] ?? DOC_LABELS.ro;
}
