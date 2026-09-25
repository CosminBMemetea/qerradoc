import type { ContentLocale, Fisa, FirmSettings } from "./types";
import { resolveContentLocale } from "./types";
import { formatDateForLocale } from "./date-format";

/** Short message sent with the PDF — always in the fișă's contentLocale. */
export function clientMessage(fisa: Fisa, settings: Pick<FirmSettings, "companyName">): string {
  const loc: ContentLocale = resolveContentLocale(fisa);
  const nr = fisa.nrFisa?.trim() || fisa.id.slice(0, 8);
  const date =
    formatDateForLocale(fisa.dataInterventiei, loc) ||
    formatDateForLocale(new Date().toISOString().slice(0, 10), loc);
  const firm = settings.companyName?.trim();
  const sig = firm ? ` — ${firm}` : "";
  if (loc === "en")
    return `Hello, please find attached service job sheet no. ${nr} dated ${date}. Thank you!${sig}`;
  if (loc === "pl")
    return `Dzień dobry, w załączniku protokół serwisowy nr ${nr} z dnia ${date}. Dziękujemy!${sig}`;
  return `Bună ziua, atașat fișa de intervenție nr. ${nr} din data ${date}. Mulțumim!${sig}`;
}

/** "Send to client" is offered once the client has signed (drawn signature). */
export function canSendToClient(fisa: Fisa): boolean {
  return !!fisa.semnaturaClientDataUrl;
}

export function waLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export type SendOutcome = "shared" | "fallback" | "cancelled";

/**
 * Share the PDF via the OS share sheet (WhatsApp, e-mail…). When file sharing
 * isn't supported (desktop) or the browser refuses, download the PDF and open
 * wa.me with the message so the user can attach it.
 */
export async function sendPdfToClient(
  blob: Blob,
  filename: string,
  text: string,
  deps: {
    nav?: Navigator;
    download: (b: Blob, name: string) => void;
    open: (url: string) => void;
  }
): Promise<SendOutcome> {
  const nav = deps.nav ?? (typeof navigator !== "undefined" ? navigator : undefined);
  const file = new File([blob], filename, { type: "application/pdf" });
  if (nav?.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: filename });
      return "shared";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return "cancelled";
      // NotAllowedError (lost user activation) etc. → fallback below
    }
  }
  deps.download(blob, filename);
  deps.open(waLink(text));
  return "fallback";
}
