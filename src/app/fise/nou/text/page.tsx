"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import DictateButton from "@/components/DictateButton";
import { Field, textareaCls } from "@/components/Field";
import { emptyFisa, newSheetContentLocale } from "@/lib/types";
import { resolveNewSheetTip, sampleWhatsApp } from "@/lib/parse-text";
import { voiceFill } from "@/lib/voice-fill";
import type { Fisa } from "@/lib/types";
import { saveFisa, getSession, getSettings } from "@/lib/db";
import { useI18n } from "@/lib/i18n";

function TextInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { t, locale } = useI18n();
  const autoDictate = search.get("dictate") === "1";
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [audioNoteDataUrl, setAudioNoteDataUrl] = useState<string | undefined>();

  const onDictate = useCallback((chunk: string) => {
    setText((prev) => {
      const cur = prev.trim();
      return cur ? `${cur} ${chunk}` : chunk;
    });
  }, []);

  const onAudioNote = useCallback((dataUrl: string) => {
    setAudioNoteDataUrl(dataUrl);
  }, []);

  async function go(parse: boolean) {
    setBusy(true);
    try {
      const [session, firm] = await Promise.all([getSession(), getSettings()]);
      const year = new Date().getFullYear();
      // Pilot-pack document language wins over the UI language.
      const contentLocale = newSheetContentLocale(firm, locale);
      const filled: { patch: Partial<Fisa>; filled: string[]; source: "llm" | "heuristic"; reason?: string } = parse
        ? await voiceFill(text, contentLocale)
        : { patch: { reclamatie: text }, filled: [], source: "heuristic" };
      const parsed = filled.patch;
      // Type: the firm default wins unless the text explicitly names the type.
      const tip = resolveNewSheetTip(text, firm.defaultTip, parsed.tip);
      const aiFilled = filled.filled.filter((k) => k !== "tip" || tip === parsed.tip);
      const fisa = emptyFisa({
        ...parsed,
        ...(tip ? { tip } : {}),
        nrFisa: parsed.nrFisa || `${year}-${String(Date.now()).slice(-4)}`,
        semnaturaTehnician:
          parsed.semnaturaTehnician || session?.technicianName || "",
        reviewed: false,
        audioNoteDataUrl,
        contentLocale,
        aiFilled: aiFilled.length ? aiFilled : undefined,
      });
      await saveFisa(fisa);
      const why = filled.source === "heuristic" && filled.reason ? `&why=${encodeURIComponent(filled.reason)}` : "";
      const q = `review=1${parse ? `&from=voice&src=${filled.source}${why}` : ""}`;
      const offline = filled.reason === "offline" || (typeof navigator !== "undefined" && navigator.onLine === false);
      if (offline) {
        // /fise/[id] needs the network (RSC); the static editor route is
        // precached by the service worker, so a full load works offline.
        window.location.assign(`/fise/edit?id=${encodeURIComponent(fisa.id)}&${q}`);
        return;
      }
      router.push(`/fise/${fisa.id}?${q}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={t("text.title")} backHref="/fise">
      <Field label={t("text.label")}>
        <textarea
          className={textareaCls + " min-h-[200px]"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("text.placeholder")}
        />
      </Field>

      <DictateButton
        append
        autoStart={autoDictate}
        onResult={onDictate}
        onAudioNote={onAudioNote}
        className="mb-5"
      />

      {audioNoteDataUrl && (
        <div className="qf-card p-3 mb-5">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
            {t("form.audioNote")}
          </p>
          <audio controls src={audioNoteDataUrl} className="w-full" />
        </div>
      )}

      <div className="space-y-3">
        <BigButton
          onClick={() => go(true)}
          disabled={busy || (!text.trim() && !audioNoteDataUrl)}
        >
          {busy ? t("voice.filling") : t("text.parse")}
        </BigButton>
        <BigButton
          variant="secondary"
          onClick={() => setText(sampleWhatsApp(locale))}
        >
          {t("text.sample")}
        </BigButton>
      </div>
      <p className="text-xs text-stone-400 dark:text-stone-500 mt-5 leading-relaxed">
        {t("text.hint")}
      </p>
    </AppShell>
  );
}

export default function NewFromTextPage() {
  return (
    <Suspense fallback={<TextFallback />}>
      <TextInner />
    </Suspense>
  );
}

function TextFallback() {
  const { t } = useI18n();
  return (
    <AppShell title={t("text.title")} backHref="/fise">
      <p className="text-center text-muted py-10">{t("app.loadingShort")}</p>
    </AppShell>
  );
}
