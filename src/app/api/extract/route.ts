import { NextRequest, NextResponse } from "next/server";
import {
  EXTRACT_MAX_HINTS,
  EXTRACT_MAX_TEXT,
  type ExtractRequest,
  type ExtractResponse,
} from "@/lib/ai-extract";
import { FALLBACK_MODEL, PRIMARY_MODEL, groqExtract } from "@/lib/groq-extract";
import type { ContentLocale } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/** GROQ_BASE_URL is only for local tests against a mock server. */
const GROQ_URL = `${process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"}/chat/completions`;

function reply(body: ExtractResponse, status = 200) {
  return NextResponse.json(body, { status });
}

function cleanList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.replace(/[\r\n|]+/g, " ").trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, EXTRACT_MAX_HINTS);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return reply({ ok: false, error: "bad_request", reason: "bad_request" }, 400);
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, EXTRACT_MAX_TEXT) : "";
  const locRaw = typeof body.locale === "string" ? body.locale.toLowerCase().slice(0, 2) : "ro";
  const locale: ContentLocale = locRaw === "en" || locRaw === "pl" ? locRaw : "ro";
  if (!text) return reply({ ok: false, error: "bad_request", reason: "bad_request" }, 400);
  const hintsRaw = (body.hints && typeof body.hints === "object" ? body.hints : {}) as Record<string, unknown>;
  const request: ExtractRequest = {
    text,
    locale,
    hints: { clients: cleanList(hintsRaw.clients), models: cleanList(hintsRaw.models) },
  };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return reply({ ok: false, error: "missing_key", reason: "missing_key" }, 503);

  const r = await groqExtract(request, {
    url: GROQ_URL,
    apiKey,
    model: process.env.GROQ_EXTRACT_MODEL || PRIMARY_MODEL,
    fallbackModel: process.env.GROQ_EXTRACT_FALLBACK_MODEL || FALLBACK_MODEL,
  });
  if (r.ok) return reply({ ok: true, source: "llm", model: r.model, data: r.data, attempts: r.attempts });
  return reply(
    {
      ok: false,
      error: r.reason === "invalid_output" ? "invalid_output" : "upstream",
      reason: r.reason,
      status: r.status,
      attempts: r.attempts,
    },
    502
  );
}
