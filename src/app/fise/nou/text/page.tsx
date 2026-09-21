"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import { Field, textareaCls } from "@/components/Field";
import { emptyFisa } from "@/lib/types";
import { parseWhatsAppText, SAMPLE_WHATSAPP } from "@/lib/parse-text";
import { saveFisa, getSession } from "@/lib/db";

export default function NewFromTextPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

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
      <div className="space-y-3">
        <BigButton
          onClick={() => go(true)}
          disabled={busy || !text.trim()}
        >
          ✨ Completează automat → Revizie
        </BigButton>
        <BigButton
          variant="secondary"
          onClick={() => setText(SAMPLE_WHATSAPP)}
        >
          📋 Încarcă text exemplu
        </BigButton>
      </div>
      <p className="text-xs text-slate-500 mt-4">
        Parser heuristic local (fără cloud). Apoi editezi manual — nu poți sări
        peste revizie.
      </p>
    </AppShell>
  );
}
