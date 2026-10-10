import { ro, type MsgKey } from "./ro";
import { en } from "./en";
import { pl } from "./pl";

export type Locale = "ro" | "en" | "pl";
export const LOCALES: Locale[] = ["ro", "en", "pl"];
export const LOCALE_COOKIE = "flota-locale";
export const CATALOGS: Record<Locale, Record<MsgKey, string>> = { ro, en, pl };
export type { MsgKey };

export type Vars = Record<string, string | number>;
export function t(loc: Locale, key: MsgKey, vars?: Vars): string {
  const s = CATALOGS[loc][key] ?? CATALOGS.ro[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}
export const isLocale = (x: unknown): x is Locale => x === "ro" || x === "en" || x === "pl";
/** Din Accept-Language: prima limbă suportată, altfel ro. */
export function pickLocale(acceptLanguage: string | null | undefined): Locale {
  for (const part of (acceptLanguage ?? "").split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return "ro";
}

// ---------- formatare (manuală, identică pe server și în browser) ----------
const SEP: Record<Locale, { th: string; dec: string }> = { ro: { th: ".", dec: "," }, pl: { th: "\u00a0", dec: "," }, en: { th: ",", dec: "." } };
export function fmtNum(loc: Locale, n: number, d = 0): string {
  const [i, f] = Math.abs(n).toFixed(d).split(".");
  const grouped = loc === "pl" && i.length <= 4 ? i : i.replace(/\B(?=(\d{3})+(?!\d))/g, SEP[loc].th);
  return (n < 0 ? "-" : "") + grouped + (f ? SEP[loc].dec + f : "");
}
/** Sume în lei (RON). */
export function fmtMoney(loc: Locale, n: number, d = 0): string {
  const v = fmtNum(loc, n, d);
  return loc === "en" ? `RON ${v}` : loc === "pl" ? `${v} RON` : `${v} lei`;
}
export function fmtPct(loc: Locale, frac: number): string {
  return `${frac >= 0 ? "+" : ""}${fmtNum(loc, frac * 100)}%`;
}
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** ISO local „2026-10-05T14:30” → ro/pl „05.10 14:30”, en „5 Oct 14:30”. */
export function fmtDate(loc: Locale, iso: string, withYear = false): string {
  const [d, h] = iso.split("T");
  const [y, m, day] = d.split("-");
  const date = loc === "en" ? `${+day} ${MONTHS_EN[+m - 1]}${withYear ? " " + y : ""}` : `${day}.${m}${withYear ? "." + y : ""}`;
  return h ? `${date} ${h.slice(0, 5)}` : date;
}
