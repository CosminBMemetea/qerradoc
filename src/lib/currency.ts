/** App / PDF locales that carry a display currency. */
export type CurrencyLocale = "ro" | "en" | "pl";

/**
 * Locale currency symbol for form placeholders and PDF column headers.
 * RO → lei (RON), EN → € (EUR), PL → zł (PLN).
 */
export function currencySymbol(locale: CurrencyLocale): string {
  switch (locale) {
    case "en":
      return "€";
    case "pl":
      return "zł";
    default:
      return "lei";
  }
}

/** ISO-style currency code for notes / metadata. */
export function currencyCode(locale: CurrencyLocale): string {
  switch (locale) {
    case "en":
      return "EUR";
    case "pl":
      return "PLN";
    default:
      return "RON";
  }
}
