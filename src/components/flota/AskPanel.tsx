"use client";
import Link from "next/link";
import { useState } from "react";
import { t, type Locale } from "@/lib/flota/i18n";
import { btnPrimary, input, Skeleton } from "./ui";

interface Msg { q: string; a?: { text: string; links: { href: string; label: string }[]; source: string; notice?: string }; err?: boolean }

export default function AskPanel({ locale: loc }: { locale: Locale }) {
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true); setQ("");
    setMsgs((m) => [{ q: question }, ...m].slice(0, 5));
    try {
      const r = await fetch("/api/flota/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, locale: loc }) });
      if (!r.ok) throw new Error();
      const a = await r.json();
      setMsgs((m) => [{ q: question, a }, ...m.slice(1)]);
    } catch { setMsgs((m) => [{ q: question, err: true }, ...m.slice(1)]); }
    setBusy(false);
  }
  const ex = [t(loc, "ask.ex1"), t(loc, "ask.ex2"), t(loc, "ask.ex3"), t(loc, "ask.ex4")];
  return (
    <section className="flota-in-2 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white shadow-lg p-4 sm:p-5">
      <div className="flex items-center gap-3"><span className="grid place-items-center w-10 h-10 rounded-2xl bg-white/15 text-xl" aria-hidden>✨</span><div><h2 className="font-semibold text-lg">{t(loc, "ask.title")}</h2><p className="text-xs text-blue-100">{t(loc, "ask.subtitle")}</p></div></div>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(loc, "ask.placeholder")} className={`${input} !bg-white !text-slate-900 !ring-0`} maxLength={500} />
        <button className={`${btnPrimary} !bg-white !text-blue-800 hover:!bg-blue-50 shrink-0`} disabled={busy || !q.trim()}>{t(loc, "ask.send")}</button>
      </form>
      <div className="flota-scroll mt-3 flex gap-2 overflow-x-auto pb-1">
        {ex.map((e) => <button key={e} onClick={() => void ask(e)} disabled={busy} className="whitespace-nowrap rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 text-xs transition">{e}</button>)}
      </div>
      {msgs.length > 0 && (
        <div className="mt-4 space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className="flota-in rounded-xl bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 p-3 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">❓ {m.q}</div>
              {m.err ? <p className="text-sm mt-1 text-rose-600">{t(loc, "ui.error")}</p>
                : !m.a ? <div className="mt-2 space-y-1.5"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/2" /><p className="text-xs text-slate-500">{t(loc, "ask.thinking")}</p></div>
                : <>
                    <p className="text-sm mt-1 leading-relaxed">{m.a.text}</p>
                    {m.a.links.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{m.a.links.map((l) => <Link key={l.href} href={l.href} className="text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-1 hover:underline">{l.label} →</Link>)}</div>}
                    <p className="text-[11px] mt-2 text-slate-400">{m.a.notice === "fallback" ? `⚠️ ${t(loc, "ask.fallback")}` : `✨ ${t(loc, "ask.ai")}`}</p>
                  </>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
