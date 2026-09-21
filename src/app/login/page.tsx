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
      // Soft gate: allow demo login even without license, warn later
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
    <div className="min-h-dvh flex flex-col bg-blue-700">
      <div className="flex-1 flex flex-col justify-center px-5 py-8 max-w-lg mx-auto w-full">
        <div className="text-center text-white mb-8">
          <div className="text-5xl mb-3">📋</div>
          <h1 className="text-3xl font-black">Querra Fișă</h1>
          <p className="text-blue-100 mt-2 text-sm">
            Fișă de service pe telefon · utilaje curățenie
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-2xl p-5 shadow-xl space-y-1"
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
          <BigButton type="submit" disabled={busy}>
            {busy ? "Se conectează…" : "Intră în aplicație"}
          </BigButton>
          <p className="text-xs text-slate-500 text-center pt-2">
            Stub autentificare locală · fără parolă (v1 demo). Licență ~999
            RON/an · max ~5 tehnicieni.
          </p>
        </form>
      </div>
    </div>
  );
}
