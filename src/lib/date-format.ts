/** "YYYY-MM-DD" → ro/pl dd.mm.yyyy, en dd/mm/yyyy ("" if not an ISO date). */
export function formatDateForLocale(v: string, locale: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
  if (!m) return "";
  const sep = locale === "en" ? "/" : ".";
  return `${m[3]}${sep}${m[2]}${sep}${m[1]}`;
}
