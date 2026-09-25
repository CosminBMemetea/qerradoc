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
    return `Hello, please find attached our service job sheet no. ${nr} dated ${date}. Thank you!${sig}`;
  if (loc === "pl")
    return `Dzień dobry, przesyłamy w załączniku protokół serwisowy nr ${nr} z dnia ${date}. Dziękujemy!${sig}`;
  return `Bună ziua, vă trimitem atașat fișa de intervenție nr. ${nr} din data ${date}. Mulțumim!${sig}`;
}

/** "Send to client" is offered once the client has signed (drawn signature). */
export function canSendToClient(fisa: Fisa): boolean {
  return !!fisa.semnaturaClientDataUrl;
}

export function waLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * "shared" – OS share sheet done; "fallback" – PDF downloaded + WhatsApp
 * opened; "blocked" – PDF downloaded but the browser blocked the WhatsApp
 * window (UI shows a tappable link); "cancelled" – user closed the sheet.
 */
export type SendOutcome = "shared" | "fallback" | "blocked" | "cancelled";

/** Minimal window handle (pre-opened synchronously on the tap). */
export type WinLike = { location: { href: string }; close: () => void; closed?: boolean; opener?: unknown };

/** Can this browser share a PDF file via the OS share sheet? (sync) */
export function canShareFiles(nav: Navigator | undefined): boolean {
  if (!nav?.share || !nav.canShare) return false;
  try {
    return nav.canShare({ files: [new File(["%PDF"], "f.pdf", { type: "application/pdf" })] });
  } catch {
    return false;
  }
}

/**
 * Must run synchronously inside the tap handler (before any await): when the
 * share sheet isn't available, open an empty window now so the popup blocker
 * sees a user gesture; its location is set after the PDF is ready.
 */
export function preopenFallbackWindow(
  nav: Navigator | undefined,
  openBlank: () => WinLike | null
): WinLike | null {
  if (canShareFiles(nav)) return null;
  try {
    return openBlank();
  } catch {
    return null;
  }
}

/**
 * Share the PDF via the OS share sheet (WhatsApp, e-mail…). When file sharing
 * isn't supported (desktop) or the browser refuses, download the PDF and open
 * wa.me with the message so the user can attach it — in the window pre-opened
 * on the tap when there is one.
 */
export async function sendPdfToClient(
  blob: Blob,
  filename: string,
  text: string,
  deps: {
    nav?: Navigator;
    download: (b: Blob, name: string) => void;
    /** Open a new window at url; return false when it was blocked. */
    open: (url: string) => boolean | void;
    /** Window opened synchronously on the tap (see preopenFallbackWindow). */
    win?: WinLike | null;
  }
): Promise<SendOutcome> {
  const nav = deps.nav ?? (typeof navigator !== "undefined" ? navigator : undefined);
  const win = deps.win && !deps.win.closed ? deps.win : null;
  const file = new File([blob], filename, { type: "application/pdf" });
  if (nav?.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: filename });
      win?.close();
      return "shared";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        win?.close();
        return "cancelled";
      }
      // NotAllowedError (lost user activation) etc. → fallback below
    }
  }
  deps.download(blob, filename);
  const url = waLink(text);
  if (win) {
    try {
      win.opener = null;
    } catch {
      /* cross-origin guard */
    }
    win.location.href = url;
    return "fallback";
  }
  return deps.open(url) === false ? "blocked" : "fallback";
}
