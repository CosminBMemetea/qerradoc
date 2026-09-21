"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import { Field, inputCls } from "@/components/Field";
import { getSettings, saveSettings } from "@/lib/db";
import type { FirmSettings } from "@/lib/types";

export default function SetariPage() {
  const [s, setS] = useState<FirmSettings>({
    companyName: "",
    cui: "",
    address: "",
    phone: "",
  });
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then(setS);
  }, []);

  async function onSave() {
    await saveSettings(s);
    setMsg("Setări salvate.");
  }

  function onLogo(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setS((prev) => ({ ...prev, logoDataUrl: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <AppShell title="Setări firmă">
      <div className="qf-card p-5 mb-2">
        <Field label="Nume firmă (antet PDF)">
          <input
            className={inputCls}
            value={s.companyName}
            onChange={(e) => setS({ ...s, companyName: e.target.value })}
          />
        </Field>
        <Field label="CUI (stub)">
          <input
            className={inputCls}
            value={s.cui}
            onChange={(e) => setS({ ...s, cui: e.target.value })}
            placeholder="RO12345678"
          />
        </Field>
        <Field label="Adresă">
          <input
            className={inputCls}
            value={s.address || ""}
            onChange={(e) => setS({ ...s, address: e.target.value })}
          />
        </Field>
        <Field label="Telefon">
          <input
            className={inputCls}
            value={s.phone || ""}
            onChange={(e) => setS({ ...s, phone: e.target.value })}
          />
        </Field>

        <Field label="Logo firmă">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onLogo(e.target.files?.[0])}
          />
          <BigButton
            variant="secondary"
            onClick={() => fileRef.current?.click()}
          >
            Încarcă logo
          </BigButton>
          {s.logoDataUrl && (
            <div className="mt-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.logoDataUrl}
                alt="Logo"
                className="h-16 w-16 object-contain rounded-xl border border-stone-200"
              />
              <button
                type="button"
                className="text-sm text-red-600 font-medium min-h-[44px] px-2"
                onClick={() => setS({ ...s, logoDataUrl: undefined })}
              >
                Elimină
              </button>
            </div>
          )}
        </Field>
      </div>

      <BigButton onClick={onSave} className="mt-4">
        Salvează setările
      </BigButton>
      {msg && (
        <p className="text-center text-teal-800 font-medium mt-3 text-sm">
          {msg}
        </p>
      )}
    </AppShell>
  );
}
