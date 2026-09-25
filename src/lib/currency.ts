import type { ContentLocale } from "./types";

/** App / PDF locales that carry a default display currency. */
export type CurrencyLocale = "ro" | "en" | "pl";

/** Small, explicit set of per-fișă currencies (ISO 4217 codes). */
export type CurrencyCode = "RON" | "EUR" | "PLN" | "GBP" | "USD";

/** Picker order. */
export const CURRENCIES: readonly CurrencyCode[] = [
  "RON",
  "EUR",
  "PLN",
  "GBP",
  "USD",
] as const;

const SYMBOLS: Record<CurrencyCode, string> = {
  RON: "lei",
  EUR: "€",
  PLN: "zł",
  GBP: "£",
  USD: "$",
};

export function isCurrencyCode(v: unknown): v is CurrencyCode {
  return typeof v === "string" && (CURRENCIES as readonly string[]).includes(v);
}

/**
 * Default currency for a document language (used at creation and as
 * read-time fallback for sheets without `currency`).
 * RO → RON (lei), EN → EUR (€), PL → PLN (zł).
 */
export function defaultCurrencyForLocale(
  locale: CurrencyLocale | string | null | undefined
): CurrencyCode {
  switch (locale) {
    case "en":
      return "EUR";
    case "pl":
      return "PLN";
    default:
      return "RON";
  }
}

/** Normalize a stored / imported value ("eur", " RON ") → CurrencyCode | undefined. */
export function normalizeCurrency(v: unknown): CurrencyCode | undefined {
  if (typeof v !== "string") return undefined;
  const up = v.trim().toUpperCase();
  return isCurrencyCode(up) ? up : undefined;
}

/**
 * Currency for a fișă: explicit `currency` if valid, otherwise the
 * contentLocale default (legacy rows without the field).
 */
export function resolveCurrency(
  fisa:
    | { currency?: string | null; contentLocale?: ContentLocale | string | null }
    | null
    | undefined
): CurrencyCode {
  const explicit = normalizeCurrency(fisa?.currency);
  if (explicit) return explicit;
  const raw = fisa?.contentLocale;
  const loc = raw ? String(raw).toLowerCase().slice(0, 2) : "ro";
  return defaultCurrencyForLocale(loc);
}

/**
 * Currency after a document-language (contentLocale) change.
 * - currencyManual === true  → keep the user's pick.
 * - currencyManual === false → follow the new locale default.
 * - currencyManual missing (legacy rows) → follow only while the current
 *   currency still equals the old locale's default.
 */
export function currencyAfterLocaleChange(
  fisa: {
    currency?: string | null;
    contentLocale?: ContentLocale | string | null;
    currencyManual?: boolean | null;
  },
  next: CurrencyLocale | string
): CurrencyCode {
  const current = resolveCurrency(fisa);
  const nextDefault = defaultCurrencyForLocale(
    String(next ?? "ro").toLowerCase().slice(0, 2)
  );
  if (fisa.currencyManual === true) return current;
  if (fisa.currencyManual === false) return nextDefault;
  const raw = fisa.contentLocale;
  const oldLoc = raw ? String(raw).toLowerCase().slice(0, 2) : "ro";
  return current === defaultCurrencyForLocale(oldLoc) ? nextDefault : current;
}

/** Display symbol for a currency code: lei, €, zł, £, $. */
export function symbolForCurrency(code: CurrencyCode): string {
  return SYMBOLS[code] ?? SYMBOLS.RON;
}

/** Picker label, e.g. "€ · EUR". */
export function currencyOptionLabel(code: CurrencyCode): string {
  return `${symbolForCurrency(code)} · ${code}`;
}

/**
 * Locale default currency symbol (legacy helper).
 * RO → lei (RON), EN → € (EUR), PL → zł (PLN).
 */
export function currencySymbol(locale: CurrencyLocale): string {
  return symbolForCurrency(defaultCurrencyForLocale(locale));
}

/** Locale default ISO code (legacy helper). */
export function currencyCode(locale: CurrencyLocale): string {
  return defaultCurrencyForLocale(locale);
}
