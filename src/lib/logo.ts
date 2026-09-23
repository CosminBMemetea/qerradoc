/** Logo helpers for Settings upload + PDF header. */

export type PdfImageFormat = "PNG" | "JPEG";

/** Detect jsPDF-compatible format from a data URL. */
export function pdfImageFormatFromDataUrl(
  dataUrl: string
): PdfImageFormat | "WEBP" | null {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const head = dataUrl.slice(0, 40).toLowerCase();
  if (head.startsWith("data:image/png")) return "PNG";
  if (
    head.startsWith("data:image/jpeg") ||
    head.startsWith("data:image/jpg")
  ) {
    return "JPEG";
  }
  if (head.startsWith("data:image/webp")) return "WEBP";
  return null;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Downscale a logo for IndexedDB (~512px max edge).
 * Keeps PNG (transparency) when source is PNG/WebP; otherwise JPEG on white.
 */
export async function compressLogo(
  dataUrl: string,
  maxEdge = 512
): Promise<string> {
  if (typeof document === "undefined") return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      const fmt = pdfImageFormatFromDataUrl(dataUrl);
      const preferPng = fmt === "PNG" || fmt === "WEBP";

      if (preferPng) {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Read + compress a logo file chosen in Settings. */
export async function readAndCompressLogo(file: File): Promise<string> {
  const raw = await readFileAsDataUrl(file);
  return compressLogo(raw, 512);
}

/**
 * Ensure data URL is PNG/JPEG for jsPDF. Converts WebP (or unknown) via canvas
 * when DOM is available; otherwise returns null so caller can skip.
 */
export async function ensurePdfCompatibleImage(
  dataUrl: string
): Promise<{ dataUrl: string; format: PdfImageFormat } | null> {
  const fmt = pdfImageFormatFromDataUrl(dataUrl);
  if (fmt === "PNG" || fmt === "JPEG") {
    return { dataUrl, format: fmt };
  }

  if (typeof document === "undefined") return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width || 1;
      canvas.height = img.height || 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      // Prefer PNG to keep any alpha from WebP
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const out = canvas.toDataURL("image/png");
      resolve({ dataUrl: out, format: "PNG" });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
