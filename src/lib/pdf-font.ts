/**
 * Load Noto Sans (bundled under public/fonts/) into a jsPDF instance.
 * Works in browser (fetch) and Node (fs) for preview scripts.
 */
import type { jsPDF } from "jspdf";

const FONT_FAMILY = "NotoSans";
const REGULAR_FILE = "NotoSans-Regular.ttf";
const BOLD_FILE = "NotoSans-Bold.ttf";

let cache: { regular: string; bold: string } | null = null;

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    for (let j = 0; j < slice.length; j++) {
      binary += String.fromCharCode(slice[j]);
    }
  }
  return btoa(binary);
}

async function loadFontBase64(): Promise<{ regular: string; bold: string }> {
  if (cache) return cache;

  // Node / tsx preview
  if (typeof window === "undefined") {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dir = path.join(process.cwd(), "public", "fonts");
    cache = {
      regular: fs.readFileSync(path.join(dir, REGULAR_FILE)).toString("base64"),
      bold: fs.readFileSync(path.join(dir, BOLD_FILE)).toString("base64"),
    };
    return cache;
  }

  const [regularBuf, boldBuf] = await Promise.all([
    fetch(`/fonts/${REGULAR_FILE}`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${REGULAR_FILE}`);
      return r.arrayBuffer();
    }),
    fetch(`/fonts/${BOLD_FILE}`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${BOLD_FILE}`);
      return r.arrayBuffer();
    }),
  ]);

  cache = {
    regular: arrayBufferToBase64(regularBuf),
    bold: arrayBufferToBase64(boldBuf),
  };
  return cache;
}

/** Register Unicode font on the document; returns family name to use with setFont. */
export async function embedUnicodeFont(doc: jsPDF): Promise<string> {
  const { regular, bold } = await loadFontBase64();
  doc.addFileToVFS(REGULAR_FILE, regular);
  doc.addFont(REGULAR_FILE, FONT_FAMILY, "normal");
  doc.addFileToVFS(BOLD_FILE, bold);
  doc.addFont(BOLD_FILE, FONT_FAMILY, "bold");
  doc.setFont(FONT_FAMILY, "normal");
  return FONT_FAMILY;
}

export function pdfFont(): string {
  return FONT_FAMILY;
}
