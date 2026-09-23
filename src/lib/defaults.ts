export const FIRM_EXAMPLES = {
  ro: "UTILAJE PROFESIONALE PENTRU CURĂȚENIE",
  en: "PROFESSIONAL CLEANING EQUIPMENT LTD",
  pl: "PROFESJONALNE MASZYNY CZYSZCZĄCE SP. Z O.O.",
} as const;

export const TECH_EXAMPLES = {
  ro: "Ion Popescu",
  en: "James Wilson",
  pl: "Jan Kowalski",
} as const;

/** Locale-aware tax / company-number placeholder for Settings. */
export const CUI_EXAMPLES = {
  ro: "RO12345678",
  en: "12345678",
  pl: "5250000000",
} as const;

export function firmExample(locale: string): string {
  if (locale === "en" || locale === "pl") return FIRM_EXAMPLES[locale];
  return FIRM_EXAMPLES.ro;
}

export function techExample(locale: string): string {
  if (locale === "en" || locale === "pl") return TECH_EXAMPLES[locale];
  return TECH_EXAMPLES.ro;
}

export function cuiExample(locale: string): string {
  if (locale === "en" || locale === "pl") return CUI_EXAMPLES[locale];
  return CUI_EXAMPLES.ro;
}

/** True if value matches any locale's firm demo example. */
export function isFirmExample(value: string): boolean {
  return (Object.values(FIRM_EXAMPLES) as string[]).includes(value);
}

/** True if value matches any locale's technician demo example. */
export function isTechExample(value: string): boolean {
  return (Object.values(TECH_EXAMPLES) as string[]).includes(value);
}
