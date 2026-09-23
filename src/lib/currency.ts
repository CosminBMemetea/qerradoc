/** App / PDF locales that carry a display currency. */
export type CurrencyLocale = "ro" | "en" | "pl";

/**
 * Locale currency symbol for form placeholders and PDF column headers.
 * RO → €, EN → £, PL → zł.
 */
export function currencySymbol(locale: CurrencyLocale): string {
  switch (locale) {
    case "en":
      return "£";
    case "pl":
      return "zł";
    default:
      return "€";
  }
}

/** ISO-style currency code for notes / metadata. */
export function currencyCode(locale: CurrencyLocale): string {
  switch (locale) {
    case "en":
      return "GBP";
    case "pl":
      return "PLN";
    default:
      return "EUR";
  }
}
