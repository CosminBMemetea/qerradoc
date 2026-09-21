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

function TextInner() {
  const router = useRouter();
  const search = useSearchParams();
  const autoDictate = search.get("dictate") === "1";
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const onDictate = useCallback((chunk: string) => {
    setText((prev) => {
      const cur = prev.trim();
      return cur ? `${cur} ${chunk}` : chunk;
    });
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
      });
      await saveFisa(fisa);
      router.push(`/fise/${fisa.id}?review=1`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Din text" backHref="/fise/nou">
      <Field label="Lipește mesajul WhatsApp / notițe">
        <textarea
          className={textareaCls + " min-h-[200px]"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex: client Hotel… utilaj Kärcher… serie…"
        />
      </Field>

      <DictateButton
        append
        autoStart={autoDictate}
        onResult={onDictate}
        className="mb-5"
      />

      <div className="space-y-3">
        <BigButton onClick={() => go(true)} disabled={busy || !text.trim()}>
          Completează automat → Revizie
        </BigButton>
        <BigButton
          variant="secondary"
          onClick={() => setText(SAMPLE_WHATSAPP)}
        >
          Încarcă text exemplu
        </BigButton>
      </div>
      <p className="text-xs text-stone-400 mt-5 leading-relaxed">
        Parser heuristic local (fără cloud). Apoi editezi manual — nu poți sări
        peste revizie.
      </p>
    </AppShell>
  );
}

export default function NewFromTextPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Din text" backHref="/fise/nou">
          <p className="text-center text-stone-500 py-10">Se încarcă…</p>
        </AppShell>
      }
    >
      <TextInner />
    </Suspense>
  );
}
