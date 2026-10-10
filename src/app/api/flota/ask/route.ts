import { NextResponse } from "next/server";
import { fleetData } from "@/lib/flota/repo";
import { TOOLS, detectLocale, parseToolCall, render, ruleIntent, type ToolCall } from "@/lib/flota/ask";
import { isLocale, type Locale } from "@/lib/flota/i18n";

export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";
const GROQ_URL = `${process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"}/chat/completions`;
const MODEL = process.env.GROQ_FLOTA_MODEL || "openai/gpt-oss-120b";

/** Trimite la Groq DOAR întrebarea și lista de funcții; nicio dată din flotă. */
async function askGroq(question: string, plates: string[]): Promise<ToolCall | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("no-key");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(GROQ_URL, {
      method: "POST", signal: ctrl.signal,
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL, temperature: 0,
        messages: [
          { role: "system", content: `You route a truck fleet owner's question (Romanian, English or Polish) to exactly one function. Today is 2026-10-15. Known plates: ${plates.join(", ")}. Always call a function; never answer in text.` },
          { role: "user", content: question.slice(0, 500) },
        ],
        tools: TOOLS.map((f) => ({ type: "function", function: f })),
        tool_choice: "required",
      }),
    });
    if (!r.ok) throw new Error(`groq-${r.status}`);
    const j = await r.json();
    const call = j.choices?.[0]?.message?.tool_calls?.[0]?.function;
    return call ? parseToolCall(call.name, call.arguments) : null;
  } finally { clearTimeout(timer); }
}

export async function POST(req: Request) {
  let body: { question?: unknown; locale?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const q = typeof body.question === "string" ? body.question.trim() : "";
  if (!q || q.length > 500) return NextResponse.json({ error: "question" }, { status: 400 });
  const loc: Locale = detectLocale(q, isLocale(body.locale) ? body.locale : "ro");
  const d = await fleetData();
  let reason: string | null = null;
  try {
    const call = await askGroq(q, d.trucks.map((x) => x.plate));
    if (call) return NextResponse.json({ ...render(loc, d, call, "ai"), locale: loc });
    reason = "no-tool";
  } catch (e) { reason = e instanceof Error ? e.message : "error"; }
  return NextResponse.json({ ...render(loc, d, ruleIntent(q), "rules"), notice: "fallback", reason, locale: loc });
}
