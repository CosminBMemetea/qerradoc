"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import { Field, inputCls } from "@/components/Field";
import { getLicense, saveLicense } from "@/lib/db";
import type { LicenseState } from "@/lib/types";

export default function LicentaPage() {
  const [lic, setLic] = useState<LicenseState>({
    activated: false,
    licenseKey: "",
    maxUsers: 5,
  });
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getLicense().then((l) => {
      setLic(l);
      setKey(l.licenseKey);
    });
  }, []);

  async function activate() {
    const trimmed = key.trim().toUpperCase();
    // Stub: any key with length >= 8 activates; "DEMO-QUERRA" always works
    if (trimmed.length < 8 && trimmed !== "DEMO") {
      setMsg("Cheia trebuie să aibă cel puțin 8 caractere (sau DEMO).");
      return;
    }
    const next: LicenseState = {
      activated: true,
      licenseKey: trimmed || "DEMO-QUERRA",
      activatedAt: new Date().toISOString(),
      maxUsers: 5,
    };
    await saveLicense(next);
    setLic(next);
    setMsg("Licență activată (stub). Valabilitate demonstrativă 1 an.");
  }

  async function deactivate() {
    const next: LicenseState = {
      activated: false,
      licenseKey: "",
      maxUsers: 5,
    };
    await saveLicense(next);
    setLic(next);
    setKey("");
    setMsg("Licență dezactivată.");
  }

  return (
    <AppShell title="Licență">
      <div className="bg-white rounded-xl border-2 border-slate-200 p-4 mb-4">
        <p className="text-sm text-slate-600">
          Activare firmă · ~<strong>200 EUR / an</strong> (~999 RON/an) · până
          la ~<strong>5 tehnicieni</strong>
        </p>
        <div
          className={`mt-3 rounded-lg px-3 py-2 font-bold text-sm ${
            lic.activated
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-900"
          }`}
        >
          {lic.activated
            ? `✓ Activă · cheie ${lic.licenseKey} · max ${lic.maxUsers} useri`
            : "○ Neactivată — poți demoua aplicația; activarea e stub"}
        </div>
        {lic.activatedAt && (
          <p className="text-xs text-slate-500 mt-2">
            Activată:{" "}
            {new Date(lic.activatedAt).toLocaleString("ro-RO", {
              timeZone: "Europe/Bucharest",
            })}{" "}
            (EET/EEST)
          </p>
        )}
      </div>

      <Field label="Cheie licență">
        <input
          className={inputCls}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="DEMO-QUERRA sau cheie ≥8 caractere"
        />
      </Field>

      <div className="space-y-3">
        <BigButton onClick={activate}>🔑 Activează licența</BigButton>
        {lic.activated && (
          <BigButton variant="secondary" onClick={deactivate}>
            Dezactivează (test)
          </BigButton>
        )}
      </div>
      {msg && (
        <p className="text-center text-sm font-medium text-blue-800 mt-3">
          {msg}
        </p>
      )}
      <p className="text-xs text-slate-500 mt-6">
        Stub: nu există server de validare. Pentru producție se va conecta un
        endpoint de activare. Fără SoftBill / e-Factura / OAK.
      </p>
    </AppShell>
  );
}
