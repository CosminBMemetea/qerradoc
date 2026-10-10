"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { Fisa } from "@/lib/types";
import { resolveContentLocale } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { getCatalogTrucks, getSession } from "@/lib/db";
import {
  CHECK_ITEMS,
  DAMAGE_ZONES,
  ZONE_SHAPES,
  applyTruckFill,
  extractTruckFields,
  labourTotal,
  normPlate,
  parsePlate,
  truckLabels,
  validateVin,
  type CatalogTruck,
  type CheckStatus,
  type DamageZone,
  type TruckData,
  type TruckLabour,
  type TruckPhoto,
} from "@/lib/truck";
import { voiceFill } from "@/lib/voice-fill";
import { pickPhoto } from "@/lib/image-compress";
import { Field, inputCls, textareaCls } from "./Field";
import DictateButton from "./DictateButton";
import SignaturePad from "./SignaturePad";
import FisaForm from "./FisaForm";

const AI_HL = " !border-indigo-300 !bg-indigo-50/70 dark:!border-indigo-700 dark:!bg-indigo-950/40";
const btn = (on: boolean, tone: "ok" | "defect" | "na" | "plain" = "plain") =>
  `min-h-[44px] rounded-xl border px-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
    on
      ? tone === "defect"
        ? "bg-red-600 text-white border-red-700"
        : tone === "ok"
          ? "bg-teal-600 text-white border-teal-700"
          : tone === "na"
            ? "bg-stone-500 text-white border-stone-600"
            : "bg-indigo-600 text-white border-indigo-700"
      : "bg-card border-border text-foreground active:bg-stone-50 dark:active:bg-stone-800"
  }`;

function PhotoInput({ label, onPick, testId }: { label: string; onPick: (url: string) => void; testId?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        data-testid={testId}
        onChange={async (e) => {
          const url = await pickPhoto(e.target.files?.[0]);
          if (url) onPick(url);
          e.target.value = "";
        }}
      />
      <button type="button" onClick={() => ref.current?.click()} className={`${btn(false)} w-full`}>
        📷 {label}
      </button>
    </>
  );
}

/** Schematic top view of tractor + trailer; tap a zone to toggle it. */
function ZonePicker({ value, onToggle, labels }: { value: DamageZone[]; onToggle: (z: DamageZone) => void; labels: Record<DamageZone, string> }) {
  return (
    <svg viewBox="-2 -2 104 44" className="w-full h-auto select-none" role="group" data-testid="zone-picker">
      {DAMAGE_ZONES.map((z) =>
        ZONE_SHAPES[z].map(([x, y, w, h], i) => (
          <rect
            key={`${z}-${i}`}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={0.8}
            role="button"
            aria-pressed={value.includes(z)}
            aria-label={labels[z]}
            onClick={() => onToggle(z)}
            className="cursor-pointer"
            fill={value.includes(z) ? "#ef4444" : "#f5f5f4"}
            stroke="#57534e"
            strokeWidth={0.4}
          >
            <title>{labels[z]}</title>
          </rect>
        ))
      )}
      <text x={0} y={43.5} fontSize={2.6} fill="#78716c">◀</text>
    </svg>
  );
}

export default function TruckForm({ fisa, onChange }: { fisa: Fisa; onChange: (f: Fisa) => void }) {
  const { locale } = useI18n();
  const L = truckLabels(locale);
  const T = fisa.truck as TruckData;
  const ai = new Set(fisa.aiFilled || []);
  const hl = (k: string) => (ai.has(k) ? AI_HL : "");
  const aiAttr = (k: string) => (ai.has(k) ? { "data-ai-filled": "true" } : {});
  const trucksListId = useId();
  const [trucks, setTrucks] = useState<CatalogTruck[]>([]);
  const [fillText, setFillText] = useState("");
  const [fillBusy, setFillBusy] = useState(false);
  const [fillMsg, setFillMsg] = useState("");
  const [techName, setTechName] = useState("");

  useEffect(() => {
    getCatalogTrucks().then(setTrucks).catch(() => {});
    getSession().then((s) => setTechName(s?.technicianName || "")).catch(() => {});
  }, []);

  /** Any edit drops its highlight and the "checked" confirmation. */
  const setTruck = (patch: Partial<TruckData>, keys: string[] = []) => {
    const drop = new Set(keys.map((k) => `truck.${k}`));
    const aiFilled = (fisa.aiFilled || []).filter((k) => !drop.has(k));
    onChange({
      ...fisa,
      truck: { ...T, ...patch, ...(patch.verifiedBy === undefined && !("verifiedBy" in patch) ? { verifiedBy: undefined, verifiedAt: undefined } : {}) },
      aiFilled: aiFilled.length ? aiFilled : undefined,
      ...("verifiedBy" in patch ? {} : { reviewed: false }),
    });
  };
  const setF = (patch: Partial<Fisa>) =>
    onChange({ ...fisa, ...patch, reviewed: false, truck: { ...T, verifiedBy: undefined, verifiedAt: undefined } });

  const onPlate = (v: string) => {
    const key = normPlate(v);
    const hit = trucks.find((t) => t.plateKey === key);
    if (hit) {
      setTruck(
        {
          plate: hit.plate,
          vin: T.vin || hit.vin || "",
          model: T.model || hit.model || "",
          driver: T.driver || hit.driver || "",
        },
        ["plate"]
      );
    } else setTruck({ plate: v }, ["plate"]);
  };

  async function onFill() {
    const text = fillText.trim();
    if (!text) return;
    setFillBusy(true);
    setFillMsg("");
    try {
      const loc = resolveContentLocale(fisa);
      let ex = extractTruckFields(text);
      let patch: Partial<Fisa> = {};
      if (T.kind === "service") {
        const r = await voiceFill(text, loc, "truck");
        patch = r.patch;
        if (r.truck) ex = r.truck;
        // Odometer, never travel km.
        delete patch.deplasareKm;
      }
      const res = applyTruckFill(fisa, text, ex, patch);
      if (!res.filled.length) setFillMsg(L.fillNone);
      else {
        onChange(res.fisa);
        setFillMsg(L.fillDone);
      }
    } finally {
      setFillBusy(false);
    }
  }

  const plateInfo = T.plate ? parsePlate(T.plate) : null;
  const vinChk = T.vin ? validateVin(T.vin) : null;
  const historyHref = T.plate ? `/camioane?plate=${encodeURIComponent(normPlate(T.plate))}` : "";

  const fillBox = (
    <details className="mb-4 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30" open={!T.plate} data-testid="truck-fill">
      <summary className="cursor-pointer select-none px-3.5 py-2.5 text-sm font-semibold text-indigo-900 dark:text-indigo-200 list-none">
        ✦ {L.fillTitle}
      </summary>
      <div className="px-3.5 pb-3.5 space-y-2">
        <textarea
          className={textareaCls}
          value={fillText}
          placeholder={L.fillHint}
          onChange={(e) => setFillText(e.target.value)}
          data-testid="truck-fill-text"
        />
        <DictateButton append onResult={(txt) => setFillText((p) => (p.trim() ? `${p.trim()} ${txt}` : txt))} />
        <button
          type="button"
          disabled={fillBusy || !fillText.trim()}
          onClick={onFill}
          className="w-full min-h-[48px] rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50"
          data-testid="truck-fill-go"
        >
          {fillBusy ? L.fillBusy : L.fillBtn}
        </button>
        {fillMsg && <p className="text-xs text-indigo-900 dark:text-indigo-200" role="status">{fillMsg}</p>}
        <p className="text-[11px] text-muted">{L.photoNote}</p>
      </div>
    </details>
  );

  const header = (
    <div data-testid="truck-header">
      <Field label={L.plate}>
        <input
          className={inputCls + hl("truck.plate") + " uppercase"}
          {...aiAttr("truck.plate")}
          list={trucksListId}
          value={T.plate}
          onChange={(e) => onPlate(e.target.value)}
          autoComplete="off"
          data-testid="truck-plate"
        />
        <datalist id={trucksListId}>
          {trucks.map((t) => (
            <option key={t.id} value={t.plate}>
              {[t.model, t.driver].filter(Boolean).join(" · ") || undefined}
            </option>
          ))}
        </datalist>
        {T.plate && !plateInfo && <p className="text-xs text-amber-700 mt-1">{L.plateInvalid}</p>}
        {historyHref && (
          <Link href={historyHref} className="inline-flex items-center min-h-[36px] text-sm font-medium text-indigo-700 dark:text-indigo-300 underline-offset-4 hover:underline" data-testid="truck-history-link">
            {L.openHistory} →
          </Link>
        )}
      </Field>
      {T.kind !== "service" && (
        <Field label={L.trailer}>
          <input className={inputCls + " uppercase"} value={T.trailer || ""} onChange={(e) => setTruck({ trailer: e.target.value })} />
        </Field>
      )}
      {T.kind === "service" && (
        <Field label={L.model}>
          <input className={inputCls} value={T.model || ""} onChange={(e) => setTruck({ model: e.target.value })} />
        </Field>
      )}
      {T.kind !== "check" && (
        <Field label={L.vin}>
          <input
            className={inputCls + hl("truck.vin") + " uppercase font-mono"}
            {...aiAttr("truck.vin")}
            value={T.vin || ""}
            maxLength={20}
            onChange={(e) => setTruck({ vin: e.target.value.toUpperCase() }, ["vin"])}
            data-testid="truck-vin"
          />
          {vinChk && !vinChk.valid && (
            <p className="text-xs text-red-700 dark:text-red-300 mt-1" role="alert" data-testid="vin-invalid">
              {L.vinInvalid} ({(T.vin || "").replace(/[\s-]/g, "").length}/17)
            </p>
          )}
          {vinChk && vinChk.valid && !vinChk.checkDigitOk && <p className="text-xs text-amber-700 mt-1">{L.vinCheckWarn}</p>}
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={L.km}>
          <input
            className={inputCls + hl("truck.km")}
            {...aiAttr("truck.km")}
            inputMode="numeric"
            value={T.km || ""}
            onChange={(e) => setTruck({ km: e.target.value.replace(/[^\d]/g, "") }, ["km"])}
            data-testid="truck-km"
          />
        </Field>
        <Field label={L.driver}>
          <input className={inputCls} value={T.driver || ""} onChange={(e) => setTruck({ driver: e.target.value })} />
        </Field>
      </div>
      <Field label={L.dateTime}>
        <input type="datetime-local" className={inputCls} value={T.dateTime || ""} onChange={(e) => setTruck({ dateTime: e.target.value })} />
      </Field>
      {T.kind === "check" && (
        <Field label={L.direction}>
          <div className="grid grid-cols-2 gap-2">
            {(["plecare", "intoarcere"] as const).map((d) => (
              <button key={d} type="button" className={btn(T.direction === d)} onClick={() => setTruck({ direction: d })}>
                {d === "plecare" ? L.plecare : L.intoarcere}
              </button>
            ))}
          </div>
        </Field>
      )}
    </div>
  );

  const photosEditor = (photos: TruckPhoto[]) => (
    <Field label={L.photos}>
      <div className="space-y-3">
        {photos.map((p, i) => (
          <div key={i} className="qf-card p-2.5 space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.dataUrl} alt={p.caption || L.photo} className="w-full max-h-56 object-contain rounded-lg bg-stone-50 dark:bg-stone-900" />
            <input
              className={inputCls}
              placeholder={L.caption}
              value={p.caption}
              onChange={(e) => setTruck({ photos: photos.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)) })}
            />
            <button type="button" className="text-xs text-red-700 dark:text-red-300 min-h-[36px]" onClick={() => setTruck({ photos: photos.filter((_, j) => j !== i) })}>
              {L.removePhoto}
            </button>
          </div>
        ))}
        <PhotoInput label={L.addPhoto} testId="truck-photo-input" onPick={(url) => setTruck({ photos: [...photos, { dataUrl: url, caption: "" }] })} />
      </div>
    </Field>
  );

  const verify = (
    <div className="qf-card p-3.5 mt-2 mb-2 border-amber-300/80 dark:border-amber-700/60" data-testid="truck-verify">
      <label className="flex items-start gap-3 text-sm font-semibold text-foreground min-h-[44px]">
        <input
          type="checkbox"
          className="mt-0.5 h-6 w-6 accent-teal-600"
          checked={!!T.verifiedBy}
          data-testid="truck-verify-box"
          onChange={(e) => {
            const name = techName || fisa.semnaturaTehnician || T.driver || "—";
            onChange({
              ...fisa,
              aiFilled: e.target.checked ? undefined : fisa.aiFilled,
              truck: e.target.checked
                ? { ...T, verifiedBy: name, verifiedAt: new Date().toISOString() }
                : { ...T, verifiedBy: undefined, verifiedAt: undefined },
            });
          }}
        />
        <span>
          {L.verify}
          {T.verifiedBy && <span className="block text-xs font-normal text-muted mt-0.5">{L.verifiedBy}: {T.verifiedBy}</span>}
        </span>
      </label>
    </div>
  );

  const sig = (label: string, nameKey: "semnaturaClient" | "semnaturaTehnician", urlKey: "semnaturaClientDataUrl" | "semnaturaTehnicianDataUrl") => (
    <Field label={label}>
      <input className={inputCls} value={fisa[nameKey]} onChange={(e) => onChange({ ...fisa, [nameKey]: e.target.value })} />
      <SignaturePad value={fisa[urlKey] || ""} onChange={(url) => onChange({ ...fisa, [urlKey]: url || undefined })} ariaLabel={label} />
    </Field>
  );

  const badge = (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800">
        🚚 {L.kind[T.kind]}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700">
        {resolveContentLocale(fisa).toUpperCase()}
      </span>
    </div>
  );

  if (T.kind === "service") {
    const labour = T.labour || [];
    const setLabour = (next: TruckLabour[]) => {
      const total = labourTotal(next);
      onChange({
        ...fisa,
        manoperaOre: total || fisa.manoperaOre,
        reviewed: false,
        truck: { ...T, labour: next, verifiedBy: undefined, verifiedAt: undefined },
      });
    };
    return (
      <div data-testid="truck-form-service">
        {badge}
        {fillBox}
        <FisaForm
          fisa={fisa}
          onChange={(f) => {
            // Signing doesn't undo the check; any data edit does.
            const strip = (x: Fisa) =>
              JSON.stringify({ ...x, semnaturaClient: 0, semnaturaTehnician: 0, semnaturaClientDataUrl: 0, semnaturaTehnicianDataUrl: 0, aiFilled: 0 });
            onChange(f.truck?.verifiedBy && strip(f) !== strip(fisa) ? { ...f, reviewed: false, truck: { ...f.truck, verifiedBy: undefined, verifiedAt: undefined } } : f);
          }}
          truckMode
          truckHeader={header}
          afterReclamatie={
            <>
              <Field label={L.constatare}>
                <textarea className={textareaCls} value={T.constatare || ""} onChange={(e) => setTruck({ constatare: e.target.value })} data-testid="truck-constatare" />
              </Field>
              {photosEditor(T.photos || [])}
              <Field label={L.labour}>
                <div className="space-y-2">
                  {labour.map((l, i) => (
                    <div key={i} className="grid grid-cols-[1fr_72px_36px] gap-2">
                      <input className={inputCls} placeholder={L.labourDesc} value={l.desc} onChange={(e) => setLabour(labour.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))} />
                      <input className={inputCls} inputMode="decimal" placeholder="h" value={l.ore} onChange={(e) => setLabour(labour.map((x, j) => (j === i ? { ...x, ore: e.target.value } : x)))} />
                      <button type="button" aria-label="×" className="rounded-lg border border-border" onClick={() => setLabour(labour.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))}
                  <button type="button" className={`${btn(false)} w-full`} onClick={() => setLabour([...labour, { desc: "", ore: "" }])} data-testid="truck-add-labour">
                    + {L.addLabour}
                  </button>
                </div>
              </Field>
            </>
          }
          beforeSignatures={verify}
        />
      </div>
    );
  }

  if (T.kind === "check") {
    const list = T.checklist || [];
    const setItem = (key: string, patch: Partial<{ status: CheckStatus; note: string; photoDataUrl?: string }>) =>
      setTruck({ checklist: list.map((c) => (c.key === key ? { ...c, ...patch } : c)) }, [`check.${key}`]);
    return (
      <div className="space-y-1" data-testid="truck-form-check">
        {badge}
        <div className="qf-card p-3.5 mb-4 text-sm text-amber-950 dark:text-amber-100 bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60">
          {L.verifyNeeded}
        </div>
        {fillBox}
        {header}
        <h3 className="font-semibold text-foreground text-sm mt-2 mb-2">{L.checklist}</h3>
        <div className="space-y-2.5 mb-4">
          {CHECK_ITEMS.map((key) => {
            const c = list.find((x) => x.key === key) || { key, status: "" as CheckStatus };
            return (
              <div key={key} className={`qf-card p-3 ${c.status === "defect" ? "!border-red-300 dark:!border-red-800" : ""}${ai.has(`truck.check.${key}`) ? " ring-2 ring-indigo-300/80" : ""}`} data-testid={`check-${key}`} {...aiAttr(`truck.check.${key}`)}>
                <div className="text-sm font-semibold mb-2">{L.item[key]}</div>
                <div className="grid grid-cols-3 gap-2">
                  {(["ok", "defect", "na"] as const).map((s) => (
                    <button key={s} type="button" className={btn(c.status === s, s)} onClick={() => setItem(key, { status: c.status === s ? "" : s })} aria-pressed={c.status === s}>
                      {L.status[s]}
                    </button>
                  ))}
                </div>
                {c.status === "defect" && (
                  <div className="mt-2 space-y-2">
                    <input className={inputCls} placeholder={L.note} value={c.note || ""} onChange={(e) => setItem(key, { note: e.target.value })} />
                    {c.photoDataUrl ? (
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.photoDataUrl} alt={L.photo} className="w-full max-h-48 object-contain rounded-lg bg-stone-50 dark:bg-stone-900" />
                        <button type="button" className="text-xs text-red-700 dark:text-red-300 min-h-[36px]" onClick={() => setItem(key, { photoDataUrl: undefined })}>
                          {L.removePhoto}
                        </button>
                      </div>
                    ) : (
                      <PhotoInput label={L.addPhoto} onPick={(url) => setItem(key, { photoDataUrl: url })} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Field label={L.observatii}>
          <textarea className={textareaCls} value={fisa.observatii} onChange={(e) => setF({ observatii: e.target.value })} />
        </Field>
        {verify}
        {sig(L.sigDriver, "semnaturaClient", "semnaturaClientDataUrl")}
      </div>
    );
  }

  // damage
  const zones = T.zones || [];
  return (
    <div className="space-y-1" data-testid="truck-form-damage">
      {badge}
      <div className="qf-card p-3.5 mb-4 text-sm text-amber-950 dark:text-amber-100 bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60">
        {L.verifyNeeded}
      </div>
      {fillBox}
      {header}
      <Field label={L.place}>
        <input className={inputCls} value={T.place || ""} onChange={(e) => setTruck({ place: e.target.value })} />
      </Field>
      <Field label={L.description}>
        <textarea className={textareaCls + hl("truck.description")} {...aiAttr("truck.description")} value={T.description || ""} onChange={(e) => setTruck({ description: e.target.value }, ["description"])} />
      </Field>
      <Field label={L.zones}>
        <div className="qf-card p-2.5">
          <ZonePicker value={zones} labels={L.zone} onToggle={(z) => setTruck({ zones: zones.includes(z) ? zones.filter((x) => x !== z) : [...zones, z] })} />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {DAMAGE_ZONES.map((z) => (
              <button key={z} type="button" aria-pressed={zones.includes(z)} className={`${btn(zones.includes(z), "defect")} !min-h-[36px] text-xs`} onClick={() => setTruck({ zones: zones.includes(z) ? zones.filter((x) => x !== z) : [...zones, z] })}>
                {L.zone[z]}
              </button>
            ))}
          </div>
        </div>
      </Field>
      {photosEditor(T.photos || [])}
      <Field label={L.parties}>
        <textarea className={textareaCls} value={T.parties || ""} onChange={(e) => setTruck({ parties: e.target.value })} />
      </Field>
      {verify}
      {sig(L.sigReporter, "semnaturaTehnician", "semnaturaTehnicianDataUrl")}
      {sig(L.sigOther, "semnaturaClient", "semnaturaClientDataUrl")}
    </div>
  );
}
