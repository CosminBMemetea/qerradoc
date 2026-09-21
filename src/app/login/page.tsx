"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession, getSettings, saveSettings, getLicense } from "@/lib/db";
import { Field, inputCls } from "@/components/Field";
import BigButton from "@/components/BigButton";

export default function LoginPage() {
  const router = useRouter();
  const [firm, setFirm] = useState("UTILAJE PROFESIONALE PENTRU CURATENIE");
  const [tech, setTech] = useState("Ion Popescu");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!firm.trim() || !tech.trim()) {
      setErr("Completează firma și numele tehnicianului.");
      return;
    }
    setBusy(true);
    try {
      const lic = await getLicense();
      const settings = await getSettings();
      await saveSettings({ ...settings, companyName: firm.trim() });
      await saveSession({
        firmName: firm.trim(),
        technicianName: tech.trim(),
        loggedInAt: new Date().toISOString(),
      });
      void lic;
      router.replace("/fise");
    } catch {
      setErr("Eroare la autentificare (local). Reîncearcă.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#F7F7F5]">
      <div className="flex-1 flex flex-col justify-center px-5 py-10 max-w-lg mx-auto w-full">
        <div className="text-center mb-10">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-indigo-600 mb-3">
            Querra
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
            Querra Fișă
          </h1>
          <p className="text-stone-500 mt-2 text-[15px] leading-relaxed max-w-xs mx-auto">
            Fișă de service pe telefon — calmă, rapidă, offline.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-sm space-y-1"
        >
          <Field label="Firmă (nume)">
            <input
              className={inputCls}
              value={firm}
              onChange={(e) => setFirm(e.target.value)}
              autoComplete="organization"
            />
          </Field>
          <Field label="Tehnician (nume)">
            <input
              className={inputCls}
              value={tech}
              onChange={(e) => setTech(e.target.value)}
              autoComplete="name"
            />
          </Field>
          {err && (
            <p className="text-red-600 text-sm font-medium py-1">{err}</p>
          )}
          <div className="pt-1">
            <BigButton type="submit" disabled={busy}>
              {busy ? "Se conectează…" : "Intră în aplicație"}
            </BigButton>
          </div>
        </form>
      </div>
    </div>
  );
}
