/**
 * Server-side Groq call with resilience:
 *   1. primary model
 *   2. on 429 / 5xx / timeout / network: one retry after a short backoff
 *      (honours Retry-After, capped)
 *   3. then a smaller, fast Groq model (also strict json_schema)
 *   4. otherwise the caller returns the real reason and the client falls
 *      back to the on-device heuristic parser.
 * fetch/sleep are injectable so the whole chain is unit-smoked.
 */
import {
  EXTRACTION_JSON_SCHEMA,
  buildExtractMessages,
  validateExtraction,
  type ExtractFailReason,
  type ExtractRequest,
  type Extraction,
} from "./ai-extract";

export const PRIMARY_MODEL = "openai/gpt-oss-120b";
export const FALLBACK_MODEL = "openai/gpt-oss-20b";
export const RETRY_CAP_MS = 2000;
export const RETRY_DEFAULT_MS = 700;
/** Whole chain must finish before the client gives up (22 s). */
export const TOTAL_BUDGET_MS = 19_000;
const ATTEMPT_MAX_MS = 9_000;

type Attempt =
  | { ok: true; data: Extraction; raw: unknown }
  | { ok: false; reason: ExtractFailReason; status?: number; retryAfterMs?: number; detail?: string };

export type GroqChainResult =
  | { ok: true; model: string; data: Extraction; attempts: string[]; raw?: unknown }
  | { ok: false; reason: ExtractFailReason; status?: number; attempts: string[] };

export type GroqDeps = {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  log?: (...a: unknown[]) => void;
};

const defaultDeps: GroqDeps = {
  fetch: (...a) => fetch(...a),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => Date.now(),
  log: (...a) => console.error(...a),
};

/** Retry-After as seconds or HTTP date → ms (null when absent/invalid). */
export function parseRetryAfter(v: string | null | undefined, now = Date.now()): number | null {
  if (!v) return null;
  const s = v.trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s) * 1000);
  const t = Date.parse(s);
  return Number.isFinite(t) ? Math.max(0, t - now) : null;
}

function retryable(a: Attempt): boolean {
  if (a.ok) return false;
  return a.reason === "rate_limited" || a.reason === "timeout" || a.reason === "network" || /^http_5\d\d$/.test(a.reason);
}

async function attempt(
  deps: GroqDeps,
  url: string,
  apiKey: string,
  model: string,
  req: ExtractRequest,
  timeoutMs: number
): Promise<Attempt> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.max(500, timeoutMs));
  try {
    const res = await deps.fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        reasoning_effort: "low",
        messages: buildExtractMessages(req),
        response_format: {
          type: "json_schema",
          json_schema: { name: "fisa_fields", strict: true, schema: EXTRACTION_JSON_SCHEMA },
        },
      }),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      const retryAfterMs = parseRetryAfter(res.headers.get("retry-after"), deps.now()) ?? undefined;
      const reason: ExtractFailReason =
        res.status === 429 ? "rate_limited" : res.status === 401 || res.status === 403 ? "auth" : (`http_${res.status}` as ExtractFailReason);
      return { ok: false, reason, status: res.status, retryAfterMs, detail };
    }
    const json = (await res.json().catch(() => null)) as { choices?: { message?: { content?: string } }[] } | null;
    const content = json?.choices?.[0]?.message?.content || "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ok: false, reason: "invalid_output" };
    }
    const data = validateExtraction(parsed, req.text, req.hints);
    return data ? { ok: true, data, raw: parsed } : { ok: false, reason: "invalid_output" };
  } catch (e) {
    const aborted = ctrl.signal.aborted || (e instanceof Error && e.name === "AbortError");
    return { ok: false, reason: aborted ? "timeout" : "network", detail: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

export async function groqExtract(
  req: ExtractRequest,
  opts: { url: string; apiKey: string; model?: string; fallbackModel?: string },
  depsIn: Partial<GroqDeps> = {}
): Promise<GroqChainResult> {
  const deps = { ...defaultDeps, ...depsIn };
  const primary = opts.model || PRIMARY_MODEL;
  const small = opts.fallbackModel || FALLBACK_MODEL;
  const start = deps.now();
  const left = () => TOTAL_BUDGET_MS - (deps.now() - start);
  const attempts: string[] = [];
  const run = async (model: string) => {
    const a = await attempt(deps, opts.url, opts.apiKey, model, req, Math.min(ATTEMPT_MAX_MS, left()));
    attempts.push(`${model}:${a.ok ? "ok" : a.reason}`);
    if (!a.ok) deps.log?.("extract upstream", model, a.reason, a.status ?? "", a.detail ?? "");
    return a;
  };

  let a = await run(primary);
  if (a.ok) return { ok: true, model: primary, data: a.data, attempts, raw: a.raw };
  let last = a;

  if (retryable(a)) {
    const wait = Math.min(RETRY_CAP_MS, a.retryAfterMs ?? RETRY_DEFAULT_MS);
    if (left() > wait + 1500) {
      await deps.sleep(wait);
      a = await run(primary);
      if (a.ok) return { ok: true, model: primary, data: a.data, attempts, raw: a.raw };
      last = a;
    }
  }
  // Auth problems won't be fixed by another model.
  if (last.reason !== "auth" && small !== primary && left() > 1500) {
    a = await run(small);
    if (a.ok) return { ok: true, model: small, data: a.data, attempts, raw: a.raw };
    // Report the primary model's failure (root cause); `attempts` lists every step.
  }
  return { ok: false, reason: last.reason, status: last.status, attempts };
}
