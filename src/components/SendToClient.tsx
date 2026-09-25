"use client";

import { useEffect, useRef, useState } from "react";
import type { Fisa, FirmSettings } from "@/lib/types";
import { resolveContentLocale } from "@/lib/types";
import { getSettings } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import {
  canSendToClient,
  clientMessage,
  preopenFallbackWindow,
  sendPdfToClient,
  waLink,
  type WinLike,
} from "@/lib/send-to-client";

/** Content that affects the PDF (ignores bookkeeping fields). */
function pdfKey(f: Fisa): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { updatedAt, reviewed, sentAt, aiFilled, ...rest } = f;
  return JSON.stringify(rest);
}

/**
 * One prominent "Trimite clientului" button: saves, builds the PDF with the
 * existing generator (contentLocale) and opens the share sheet with a short
 * message. The PDF is pre-generated while the form is idle so the tap can
 * call navigator.share() immediately (iOS needs a fresh user gesture).
 */
export default function SendToClient({
  fisa,
  persist,
}: {
  fisa: Fisa;
  /** Save the current form (reviewed) and return what was stored. */
  persist: (next: Fisa) => Promise<Fisa>;
}) {
  const { t, dateLang } = useI18n();
  const [settings, setSettings] = useState<FirmSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [blockedUrl, setBlockedUrl] = useState("");
  const ready = useRef<{ key: string; blob: Blob; name: string } | null>(null);
  const visible = canSendToClient(fisa);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const build = async (f: Fisa, s: FirmSettings) => {
    const { generateFisaPdf, pdfFilePrefix } = await import("@/lib/pdf");
    const loc = resolveContentLocale(f);
    const blob = await generateFisaPdf(f, s, loc);
    const name = `${pdfFilePrefix(loc)}_${f.nrFisa || f.id.slice(0, 8)}.pdf`;
    return { key: pdfKey(f), blob, name };
  };

  // Pre-generate (debounced) whenever the sheet content changes.
  useEffect(() => {
    if (!visible || !settings) return;
    let cancelled = false;
    const id = window.setTimeout(() => {
      build(fisa, settings)
        .then((r) => {
          if (!cancelled) ready.current = r;
        })
        .catch(() => {});
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [fisa, settings, visible]);

  if (!visible) return null;

  async function onSend() {
    if (busy) return;
    // Synchronously, on the tap: without a file share sheet (desktop) open the
    // WhatsApp window now — after the awaits below a popup blocker would stop it.
    const win = preopenFallbackWindow(
      typeof navigator !== "undefined" ? navigator : undefined,
      () => window.open("about:blank", "_blank") as WinLike | null
    );
    setBusy(true);
    setMsg("");
    setBlockedUrl("");
    try {
      const s = settings ?? (await getSettings());
      const key = pdfKey(fisa);
      const pre = ready.current && ready.current.key === key ? ready.current : null;
      const saved = await persist({ ...fisa, reviewed: true });
      const pdf = pre ?? (await build(saved, s));
      const outcome = await sendPdfToClient(pdf.blob, pdf.name, clientMessage(saved, s), {
        download: (b, n) => {
          const url = URL.createObjectURL(b);
          const a = document.createElement("a");
          a.href = url;
          a.download = n;
          a.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 4000);
        },
        open: (url) => !!window.open(url, "_blank", "noopener"),
        win,
      });
      if (outcome === "cancelled") return;
      await persist({ ...saved, sentAt: new Date().toISOString() });
      if (outcome === "blocked") setBlockedUrl(waLink(clientMessage(saved, s)));
      setMsg(
        outcome === "shared" ? t("send.done") : outcome === "blocked" ? t("send.blocked") : t("send.fallback")
      );
    } catch {
      win?.close();
      setMsg(t("send.error"));
    } finally {
      setBusy(false);
    }
  }

  const sentLabel = fisa.sentAt
    ? t("send.sentAt", {
        time: new Date(fisa.sentAt).toLocaleString(dateLang, {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      })
    : "";

  return (
    <div className="space-y-2" data-testid="send-to-client">
      {sentLabel && (
        <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-teal-800 dark:text-teal-300">
          <span aria-hidden="true">✓</span>
          {sentLabel}
        </p>
      )}
      <button
        type="button"
        onClick={onSend}
        disabled={busy}
        data-testid="send-to-client-button"
        className="w-full flex items-center gap-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-5 py-4 min-h-[72px] shadow-lg shadow-indigo-600/25 dark:shadow-indigo-950/60 border border-indigo-700/30 transition active:scale-[0.99] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900"
      >
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/15 shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
          </svg>
        </span>
        <span className="text-left min-w-0">
          <span className="block text-lg font-semibold tracking-tight">
            {busy ? t("send.preparing") : fisa.sentAt ? t("send.again") : t("send.button")}
          </span>
          <span className="block text-sm text-indigo-100">{t("send.hint")}</span>
        </span>
      </button>
      {msg && (
        <p role="status" className="text-center text-sm text-muted">
          {msg}
        </p>
      )}
      {blockedUrl && (
        <a
          href={blockedUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="send-open-whatsapp"
          className="block text-center text-sm font-semibold text-indigo-700 dark:text-indigo-300 underline"
        >
          {t("send.openWhatsApp")}
        </a>
      )}
    </div>
  );
}
