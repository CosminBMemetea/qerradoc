"use client";

import { useEffect, useId, useState } from "react";
import type {
  CatalogClient,
  CatalogEquipment,
  ContentLocale,
  Fisa,
  TipFisa,
} from "@/lib/types";
import { TIPURI, resolveContentLocale } from "@/lib/types";
import { useI18n, LOCALE_LABELS } from "@/lib/i18n";
import { currencySymbol } from "@/lib/currency";
import { getCatalogClients, getCatalogEquipment } from "@/lib/db";
import { Field, inputCls, textareaCls } from "./Field";
import DictateButton from "./DictateButton";
import SignaturePad from "./SignaturePad";

export default function FisaForm({
  fisa,
  onChange,
}: {
  fisa: Fisa;
  onChange: (f: Fisa) => void;
}) {
  const { t, dateLang } = useI18n();
  const clientListId = useId();
  const equipListId = useId();
  const [clients, setClients] = useState<CatalogClient[]>([]);
  const [equipment, setEquipment] = useState<CatalogEquipment[]>([]);
  const contentLocale = resolveContentLocale(fisa);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCatalogClients(), getCatalogEquipment()]).then(
      ([c, e]) => {
        if (cancelled) return;
        setClients(c);
        setEquipment(e);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);
  const contentLocaleLabel =
    contentLocale === "en" ? "EN" : contentLocale === "pl" ? "PL" : "RO";
  const set = <K extends keyof Fisa>(key: K, value: Fisa[K]) =>
    onChange({ ...fisa, [key]: value });

  const onContentLocaleChange = (next: ContentLocale) => {
    if (next === contentLocale) return;
    if (!confirm(t("form.contentLocaleWarn"))) return;
    set("contentLocale", next);
  };

  const setPiesa = (
    idx: number,
    key: "denumire" | "cod" | "cantitate" | "pretEur",
    value: string
  ) => {
    const piese = fisa.piese.map((p, i) =>
      i === idx ? { ...p, [key]: value } : p
    );
    onChange({ ...fisa, piese });
  };

  const appendField = (key: "reclamatie" | "observatii", text: string) => {
    const cur = (fisa[key] || "").trim();
    set(key, cur ? `${cur} ${text}` : text);
  };

  return (
    <div className="space-y-1">
      <div className="qf-card p-3.5 mb-4 text-sm text-amber-950 dark:text-amber-100 bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60">
        {t("form.reviewBanner")}
      </div>

      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700">
          {t("form.documentLang")}: {contentLocaleLabel}
        </span>
      </div>

      <details className="mb-4 rounded-xl border border-border bg-card open:shadow-sm">
        <summary className="cursor-pointer select-none px-3.5 py-2.5 text-xs font-medium text-muted list-none [&::-webkit-details-marker]:hidden">
          {t("form.contentLocaleChange")}
        </summary>
        <div className="px-3.5 pb-3.5 pt-1 space-y-2">
          <p className="text-xs text-muted leading-relaxed">
            {t("form.contentLocaleHint")}
          </p>
          <label className="block text-xs font-medium text-foreground">
            {t("form.contentLocale")}
            <select
              className={`${inputCls} mt-1`}
              value={contentLocale}
              onChange={(e) =>
                onContentLocaleChange(e.target.value as ContentLocale)
              }
            >
              {(["ro", "en", "pl"] as ContentLocale[]).map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()} — {LOCALE_LABELS[l]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>

      <Field label={t("form.tip")} hint={t("hint.tip")}>
        <div className="grid grid-cols-2 gap-2">
          {TIPURI.map((tip) => (
            <button
              key={tip}
              type="button"
              onClick={() => set("tip", tip as TipFisa)}
              className={`min-h-[48px] rounded-xl border px-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                fisa.tip === tip
                  ? "bg-indigo-600 text-white border-indigo-700"
                  : "bg-card border-border text-foreground active:bg-stone-50 dark:active:bg-stone-800"
              }`}
            >
              {t(`tip.${tip}`)}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("form.nrFisa")}>
        <input
          className={inputCls}
          value={fisa.nrFisa}
          onChange={(e) => set("nrFisa", e.target.value)}
          placeholder={t("form.nrPlaceholder")}
        />
      </Field>

      <Field label={t("form.proprietar")}>
        <input
          className={inputCls}
          value={fisa.proprietar}
          onChange={(e) => set("proprietar", e.target.value)}
        />
      </Field>

      <Field label={t("form.client")} hint={t("hint.client")}>
        <input
          className={inputCls}
          list={clientListId}
          value={fisa.client}
          onChange={(e) => {
            const name = e.target.value;
            const match = clients.find(
              (c) => c.name.toLowerCase() === name.trim().toLowerCase()
            );
            if (match) {
              onChange({
                ...fisa,
                client: match.name,
                locatie:
                  !fisa.locatie.trim() && match.locatie
                    ? match.locatie
                    : fisa.locatie,
              });
            } else {
              set("client", name);
            }
          }}
          autoComplete="off"
        />
        <datalist id={clientListId}>
          {clients.map((c) => (
            <option key={c.id} value={c.name}>
              {c.locatie || undefined}
            </option>
          ))}
        </datalist>
      </Field>

      <Field label={t("form.locatie")} hint={t("hint.locatie")}>
        <input
          className={inputCls}
          value={fisa.locatie}
          onChange={(e) => set("locatie", e.target.value)}
        />
      </Field>

      <Field label={t("form.modelUtilaj")} hint={t("hint.modelUtilaj")}>
        <input
          className={inputCls}
          list={equipListId}
          value={fisa.modelUtilaj}
          onChange={(e) => {
            const raw = e.target.value.trim();
            const lower = raw.toLowerCase();
            const byLabel = equipment.find(
              (eq) =>
                (eq.serie
                  ? `${eq.model} · ${eq.serie}`
                  : eq.model
                ).toLowerCase() === lower
            );
            const byModel = byLabel
              ? undefined
              : equipment.find((eq) => eq.model.toLowerCase() === lower);
            const match = byLabel || byModel;
            if (match) {
              onChange({
                ...fisa,
                modelUtilaj: match.model,
                serie: byLabel
                  ? match.serie || ""
                  : !fisa.serie.trim() && match.serie
                    ? match.serie
                    : fisa.serie,
                client:
                  !fisa.client.trim() && match.clientName
                    ? match.clientName
                    : fisa.client,
              });
            } else {
              set("modelUtilaj", e.target.value);
            }
          }}
          autoComplete="off"
        />
        <datalist id={equipListId}>
          {equipment.map((eq) => (
            <option
              key={eq.id}
              value={eq.serie ? `${eq.model} · ${eq.serie}` : eq.model}
            >
              {eq.clientName || undefined}
            </option>
          ))}
        </datalist>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("form.serie")}>
          <input
            className={inputCls}
            value={fisa.serie}
            onChange={(e) => set("serie", e.target.value)}
          />
        </Field>
        <Field label={t("form.oreFunctionare")}>
          <input
            className={inputCls}
            inputMode="decimal"
            value={fisa.oreFunctionare}
            onChange={(e) => set("oreFunctionare", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("form.manoperaOre")}>
          <input
            className={inputCls}
            inputMode="decimal"
            value={fisa.manoperaOre}
            onChange={(e) => set("manoperaOre", e.target.value)}
          />
        </Field>
        <Field label={t("form.deplasareKm")}>
          <input
            className={inputCls}
            inputMode="decimal"
            value={fisa.deplasareKm}
            onChange={(e) => set("deplasareKm", e.target.value)}
          />
        </Field>
      </div>

      <Field label={t("form.deplasareDaNu")}>
        <div className="flex gap-2">
          {(
            [
              { v: "DA" as const, label: t("form.yes") },
              { v: "NU" as const, label: t("form.no") },
            ] as const
          ).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => set("deplasareDaNu", v)}
              className={`flex-1 min-h-[48px] rounded-xl border font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                fisa.deplasareDaNu === v
                  ? "bg-indigo-600 text-white border-indigo-700"
                  : "bg-card border-border active:bg-stone-50 dark:active:bg-stone-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("form.reclamatie")} hint={t("hint.reclamatie")}>
        <textarea
          className={textareaCls}
          value={fisa.reclamatie}
          placeholder={t("hint.reclamatie")}
          onChange={(e) => set("reclamatie", e.target.value)}
        />
        <div className="mt-2">
          <DictateButton
            append
            onResult={(txt) => appendField("reclamatie", txt)}
            onAudioNote={(dataUrl) => set("audioNoteDataUrl", dataUrl)}
          />
        </div>
      </Field>

      {fisa.photoDataUrl && (
        <div className="rounded-2xl overflow-hidden border border-border mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fisa.photoDataUrl}
            alt={t("form.photoAlt")}
            className="w-full max-h-48 object-contain bg-stone-50 dark:bg-stone-900"
          />
        </div>
      )}

      {fisa.audioNoteDataUrl && (
        <div className="qf-card p-3 mb-4">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
            {t("form.audioNote")}
          </p>
          <audio controls src={fisa.audioNoteDataUrl} className="w-full" />
        </div>
      )}

      <div className="mb-4">
        <h3 className="font-semibold text-foreground mb-1 text-sm">
          {t("form.piese")}
        </h3>
        <p className="text-xs text-stone-400 dark:text-stone-500 mb-2">
          {t("hint.piese")}
        </p>
        <div className="space-y-3">
          {fisa.piese.slice(0, 15).map((p, idx) => (
            <div key={p.nr} className="qf-card p-3">
              <div className="text-xs font-medium text-stone-400 dark:text-stone-500 mb-1.5">
                {t("form.piesaNr")} {p.nr}
              </div>
              <input
                className={`${inputCls} mb-2`}
                placeholder={t("form.denumire")}
                value={p.denumire}
                onChange={(e) => setPiesa(idx, "denumire", e.target.value)}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  className={inputCls}
                  placeholder={t("form.cod")}
                  value={p.cod}
                  onChange={(e) => setPiesa(idx, "cod", e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder={t("form.cant")}
                  inputMode="decimal"
                  value={p.cantitate}
                  onChange={(e) => setPiesa(idx, "cantitate", e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder={t("form.pret", { currency: currencySymbol(contentLocale) })}
                  inputMode="decimal"
                  value={p.pretEur}
                  onChange={(e) => setPiesa(idx, "pretEur", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1">
        <Field label={t("form.dataAnuntarii")} hint={t("hint.dates")}>
          <input
            type="date"
            lang={dateLang}
            className={inputCls}
            value={fisa.dataAnuntarii}
            onChange={(e) => set("dataAnuntarii", e.target.value)}
          />
        </Field>
        <Field label={t("form.dataInterventiei")}>
          <input
            type="date"
            lang={dateLang}
            className={inputCls}
            value={fisa.dataInterventiei}
            onChange={(e) => set("dataInterventiei", e.target.value)}
          />
        </Field>
      </div>

      <Field label={t("form.observatii")} hint={t("hint.observatii")}>
        <textarea
          className={textareaCls}
          value={fisa.observatii}
          placeholder={t("hint.observatii")}
          onChange={(e) => set("observatii", e.target.value)}
        />
        <div className="mt-2">
          <DictateButton
            append
            onResult={(txt) => appendField("observatii", txt)}
            onAudioNote={(dataUrl) => set("audioNoteDataUrl", dataUrl)}
          />
        </div>
      </Field>

      <Field label={t("form.motiveInlocuire")} hint={t("hint.motiveInlocuire")}>
        <textarea
          className={textareaCls}
          value={fisa.motiveInlocuire}
          placeholder={t("hint.motiveInlocuire")}
          onChange={(e) => set("motiveInlocuire", e.target.value)}
        />
      </Field>

      <Field label={t("form.semnaturaClient")} hint={t("hint.semnaturi")}>
        <input
          className={inputCls}
          value={fisa.semnaturaClient}
          onChange={(e) => set("semnaturaClient", e.target.value)}
          placeholder={t("form.semnaturaClientPh")}
        />
        <SignaturePad
          value={fisa.semnaturaClientDataUrl || ""}
          onChange={(url) =>
            set("semnaturaClientDataUrl", url ? url : undefined)
          }
          ariaLabel={t("sig.clientPad")}
        />
      </Field>

      <Field label={t("form.semnaturaTehnician")} hint={t("hint.semnaturi")}>
        <input
          className={inputCls}
          value={fisa.semnaturaTehnician}
          onChange={(e) => set("semnaturaTehnician", e.target.value)}
        />
        <SignaturePad
          value={fisa.semnaturaTehnicianDataUrl || ""}
          onChange={(url) =>
            set("semnaturaTehnicianDataUrl", url ? url : undefined)
          }
          ariaLabel={t("sig.techPad")}
        />
      </Field>
    </div>
  );
}
