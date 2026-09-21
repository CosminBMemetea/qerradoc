import { emptyFisa } from "./types";
import { parseWhatsAppText, SAMPLE_WHATSAPP } from "./parse-text";
import { saveFisa } from "./db";

export { SAMPLE_WHATSAPP };

export async function seedDemoFisa(technicianName: string) {
  const parsed = parseWhatsAppText(SAMPLE_WHATSAPP);
  const fisa = emptyFisa({
    ...parsed,
    nrFisa: "DEMO-001",
    semnaturaTehnician: technicianName || "Ion Popescu",
    semnaturaClient: "Recepție Hotel Belvedere",
    reviewed: true,
    observatii: "Fișă demo generată din text WhatsApp exemplu.",
    motiveInlocuire: "Filtru colmatat; perie uzată — înlocuire necesară.",
  });
  // ensure piese from sample
  if (fisa.piese[0] && !fisa.piese[0].denumire) {
    fisa.piese[0] = {
      nr: 1,
      denumire: "Filtru HEPA",
      cod: "6.414-631.0",
      cantitate: "1",
      pretEur: "45.00",
    };
    fisa.piese[1] = {
      nr: 2,
      denumire: "Perie cilindrică",
      cod: "",
      cantitate: "1",
      pretEur: "28.00",
    };
  }
  await saveFisa(fisa);
  return fisa;
}
