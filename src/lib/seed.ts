import { loadDemo } from "./demos";
import type { DemoLocale } from "./demos";

/**
 * Legacy "Load demo sheet" entry point.
 * Redirects to the locale-aware industry builder (curățenie / cleaning)
 * so EN/PL no longer get Oradea / Ion Popescu WhatsApp seed content.
 */
export async function seedDemoFisa(
  technicianName: string,
  locale: DemoLocale | string = "ro"
) {
  const loc: DemoLocale =
    locale === "en" || locale === "pl" || locale === "ro" ? locale : "ro";
  return loadDemo("curatenie", loc, technicianName);
}
