import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const MODEL = "whisper-large-v3";
const MAX_BYTES = 25 * 1024 * 1024; // ~25MB

const LANG_MAP: Record<string, string> = {
  ro: "ro",
  en: "en",
  pl: "pl",
};

const ALLOWED_MIME_PREFIXES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/flac",
  "video/webm", // some browsers label webm audio this way
];

function isAllowedMime(mime: string): boolean {
  const base = (mime || "").split(";")[0].trim().toLowerCase();
  if (!base) return true; // allow unknown; Groq will reject if bad
  return ALLOWED_MIME_PREFIXES.some(
    (p) => base === p || base.startsWith(p + "/")
  ) || ALLOWED_MIME_PREFIXES.includes(base);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing_key" }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_form", message: "Expected multipart form with field file" },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "missing_file", message: "Multipart field 'file' is required" },
      { status: 400 }
    );
  }

  const blob = file as Blob;
  if (blob.size <= 0) {
    return NextResponse.json(
      { error: "empty_file", message: "Audio file is empty" },
      { status: 400 }
    );
  }
  if (blob.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: "too_large",
        message: `Audio exceeds ~25MB limit (${blob.size} bytes)`,
      },
      { status: 413 }
    );
  }

  const mime = blob.type || "application/octet-stream";
  if (!isAllowedMime(mime)) {
    return NextResponse.json(
      {
        error: "unsupported_type",
        message: `Unsupported audio type: ${mime}. Use webm, mp4, wav, or ogg.`,
      },
      { status: 415 }
    );
  }

  const langRaw = String(form.get("language") || "").toLowerCase().trim();
  const language = LANG_MAP[langRaw];

  const upstream = new FormData();
  const filename =
    (typeof File !== "undefined" && file instanceof File && file.name) ||
    guessFilename(mime);
  upstream.append("file", blob, filename);
  upstream.append("model", MODEL);
  if (language) upstream.append("language", language);
  upstream.append("response_format", "json");

  let groqRes: Response;
  try {
    groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: upstream,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error to Groq";
    return NextResponse.json(
      { error: "upstream_network", message },
      { status: 502 }
    );
  }

  const rawText = await groqRes.text();
  let parsed: { text?: string; error?: { message?: string } } = {};
  try {
    parsed = rawText ? JSON.parse(rawText) : {};
  } catch {
    /* non-JSON body */
  }

  if (!groqRes.ok) {
    const message =
      parsed?.error?.message ||
      rawText.slice(0, 400) ||
      `Groq transcription failed (${groqRes.status})`;
    return NextResponse.json(
      { error: "upstream_error", message },
      { status: groqRes.status >= 400 && groqRes.status < 600 ? groqRes.status : 502 }
    );
  }

  const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
  return NextResponse.json({ text });
}

function guessFilename(mime: string): string {
  const base = mime.split(";")[0].trim().toLowerCase();
  if (base.includes("mp4") || base.includes("m4a")) return "audio.mp4";
  if (base.includes("wav")) return "audio.wav";
  if (base.includes("ogg")) return "audio.ogg";
  if (base.includes("mpeg") || base.includes("mp3")) return "audio.mp3";
  return "audio.webm";
}
