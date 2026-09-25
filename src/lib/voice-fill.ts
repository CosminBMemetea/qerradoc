"use client";

import type { ContentLocale, Fisa } from "./types";
import {
  applyCatalog,
  catalogHints,
  extractionHasContent,
  extractionToFisa,
  type ExtractResponse,
} from "./ai-extract";
import { parseWhatsAppText } from "./parse-text";
import { getCatalogClients, getCatalogEquipment } from "./db";

export type VoiceFillResult = {
  patch: Partial<Fisa>;
  filled: string[];
  source: "llm" | "heuristic";
};

const CLIENT_TIMEOUT_MS = 18_000;

/** Keys the heuristic parser actually filled (for highlighting). */
function heuristicFilled(p: Partial<Fisa>): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(p)) {
    if (k === "piese") {
      if (Array.isArray(v) && v.some((x) => typeof x === "object" && x && x.denumire)) keys.push(k);
    } else if (typeof v === "string" && v.trim()) keys.push(k);
  }
  return keys;
}

/**
 * Transcript/text → fișă fields. LLM route first (Groq, strict JSON, output in
 * contentLocale); falls back to the on-device heuristic parser when the key
 * is missing, the call fails/times out, or the model found nothing.
 */
export async function voiceFill(
  text: string,
  locale: ContentLocale
): Promise<VoiceFillResult> {
  const trimmed = text.trim();
  const [clients, equipment] = await Promise.all([
    getCatalogClients().catch(() => []),
    getCatalogEquipment().catch(() => []),
  ]);
  if (trimmed) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          text: trimmed,
          locale,
          hints: catalogHints(clients, equipment),
        }),
      });
      const json = (await res.json().catch(() => null)) as ExtractResponse | null;
      if (json && json.ok && extractionHasContent(json.data)) {
        const matched = applyCatalog(json.data, clients, equipment);
        const { patch, filled } = extractionToFisa(matched);
        return { patch, filled, source: "llm" };
      }
    } catch {
      /* offline / timeout → heuristic */
    } finally {
      clearTimeout(timer);
    }
  }
  const patch = parseWhatsAppText(trimmed);
  return { patch, filled: heuristicFilled(patch), source: "heuristic" };
}
