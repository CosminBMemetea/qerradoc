import { NextRequest, NextResponse } from "next/server";
import {
  EXTRACTION_JSON_SCHEMA,
  EXTRACT_MAX_HINTS,
  EXTRACT_MAX_TEXT,
  buildExtractMessages,
  validateExtraction,
  type ExtractRequest,
  type ExtractResponse,
} from "@/lib/ai-extract";
import type { ContentLocale } from "@/lib/types";

export const runtime = "nodejs";

/** GROQ_BASE_URL is only for local tests against a mock server. */
const GROQ_URL = `${process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"}/chat/completions`;
/** Fast Groq model with strict json_schema (constrained decoding). */
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const TIMEOUT_MS = 15_000;

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
    return reply({ ok: false, error: "bad_request" }, 400);
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, EXTRACT_MAX_TEXT) : "";
  const locRaw = typeof body.locale === "string" ? body.locale.toLowerCase().slice(0, 2) : "ro";
  const locale: ContentLocale = locRaw === "en" || locRaw === "pl" ? locRaw : "ro";
  if (!text) return reply({ ok: false, error: "bad_request" }, 400);
  const hintsRaw = (body.hints && typeof body.hints === "object" ? body.hints : {}) as Record<string, unknown>;
  const request: ExtractRequest = {
    text,
    locale,
    hints: { clients: cleanList(hintsRaw.clients), models: cleanList(hintsRaw.models) },
  };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return reply({ ok: false, error: "missing_key" }, 503);
  const model = process.env.GROQ_EXTRACT_MODEL || DEFAULT_MODEL;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        reasoning_effort: "low",
        messages: buildExtractMessages(request),
        response_format: {
          type: "json_schema",
          json_schema: { name: "fisa_fields", strict: true, schema: EXTRACTION_JSON_SCHEMA },
        },
      }),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      console.error("extract upstream", res.status, detail);
      return reply({ ok: false, error: "upstream" }, 502);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content || "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return reply({ ok: false, error: "invalid_output" }, 502);
    }
    const data = validateExtraction(parsed, text, request.hints);
    if (!data) return reply({ ok: false, error: "invalid_output" }, 502);
    return reply({ ok: true, source: "llm", model, data });
  } catch (e) {
    console.error("extract failed", e instanceof Error ? e.message : e);
    return reply({ ok: false, error: "upstream" }, 502);
  } finally {
    clearTimeout(timer);
  }
}
