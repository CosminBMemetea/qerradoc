"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import DictateButton from "@/components/DictateButton";
import { Field, textareaCls } from "@/components/Field";
import { emptyFisa } from "@/lib/types";
import { parseWhatsAppText, SAMPLE_WHATSAPP } from "@/lib/parse-text";
import { saveFisa, getSession } from "@/lib/db";
import { useI18n } from "@/lib/i18n";

function TextInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { t } = useI18n();
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
      const session = await getSession();
      const parsed = parse ? parseWhatsAppText(text) : { reclamatie: text };
      const year = new Date().getFullYear();
      const fisa = emptyFisa({
        ...parsed,
        nrFisa: parsed.nrFisa || `${year}-${String(Date.now()).slice(-4)}`,
        semnaturaTehnician:
          parsed.semnaturaTehnician || session?.technicianName || "",
        reviewed: false,
        audioNoteDataUrl,
      });
      await saveFisa(fisa);
      router.push(`/fise/${fisa.id}?review=1`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={t("text.title")} backHref="/fise/nou">
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
          {t("text.parse")}
        </BigButton>
        <BigButton
          variant="secondary"
          onClick={() => setText(SAMPLE_WHATSAPP)}
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
    <AppShell title={t("text.title")} backHref="/fise/nou">
      <p className="text-center text-muted py-10">{t("app.loadingShort")}</p>
    </AppShell>
  );
}
