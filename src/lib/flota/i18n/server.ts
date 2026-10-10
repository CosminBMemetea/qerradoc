import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, isLocale, pickLocale, type Locale } from "./index";
/** Limba: cookie salvat de comutator, altfel limba browserului. */
export function getLocale(): Locale {
  const c = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(c) ? c : pickLocale(headers().get("accept-language"));
}
export function getTheme(): "light" | "dark" {
  return cookies().get("flota-theme")?.value === "dark" ? "dark" : "light";
}
