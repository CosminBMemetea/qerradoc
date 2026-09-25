/** Date shown on documents: locale format when ISO, otherwise the raw text. */
export function docDate(v: string | undefined | null, locale: string): string {
  const raw = (v || "").trim();
  return formatDateForLocale(raw.slice(0, 10), locale) || raw;
}

/**
 * Today's date as yyyy-mm-dd in the device's local time zone (not UTC:
 * toISOString() gave "yesterday" between 00:00 and 03:00 in Bucharest).
 */
export function localIsoDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Local date+time stamp in the document locale (dd.mm.yyyy HH:MM / dd/mm/yyyy HH:MM). */
export function docStamp(d: Date, locale: string): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const iso = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return `${formatDateForLocale(iso, locale)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "YYYY-MM-DD" → ro/pl dd.mm.yyyy, en dd/mm/yyyy ("" if not an ISO date). */
export function formatDateForLocale(v: string, locale: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
  if (!m) return "";
  const sep = locale === "en" ? "/" : ".";
  return `${m[3]}${sep}${m[2]}${sep}${m[1]}`;
}
