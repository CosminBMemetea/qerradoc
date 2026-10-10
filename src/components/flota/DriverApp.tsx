"use client";
import { useEffect, useRef, useState } from "react";
import { fmtNum, t, type Locale } from "@/lib/flota/i18n";
import { haversineKm, type LatLng } from "@/lib/flota/data";
import { btn, input } from "./ui";

const WORK_START = 6, WORK_END = 22;
const inWorkHours = (d = new Date()) => d.getHours() >= WORK_START && d.getHours() < WORK_END;
const DRIVER = "Ioan", PLATE = "BH 21 QRT";
type Mode = "off" | "on" | "demo";

export default function DriverApp({ locale: loc }: { locale: Locale }) {
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState<Mode>("off");
  const [km, setKm] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [lastFill, setLastFill] = useState<{ litres: number; km: number } | null>(null);
  const [form, setForm] = useState({ litres: "", km: "", station: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const watch = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const last = useRef<LatLng | null>(null);
  const add = (s: string) => setLog((l) => [`${new Date().toTimeString().slice(0, 5)} ${s}`, ...l].slice(0, 5));

  useEffect(() => { fetch(`/api/flota/driver-fill?plate=${encodeURIComponent(PLATE)}`).then((r) => r.json()).then((j) => { const f = j.fills?.[0]; if (f) setLastFill({ litres: f.litres, km: f.km }); }).catch(() => {}); }, []);
  useEffect(() => () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); if (timer.current) clearInterval(timer.current); }, []);

  async function send(lat: number, lng: number, accuracy: number, demo: boolean) {
    if (!inWorkHours()) { add(t(loc, "driver.outside")); return; }
    const p: LatLng = [lat, lng];
    if (last.current) setKm((k) => k + haversineKm(last.current!, p));
    last.current = p;
    const r = await fetch("/api/flota/positions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lat, lng, accuracy, driver: DRIVER, plate: PLATE, consent: true, demo }) });
    add(r.ok ? `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}` : `⚠️ ${r.status}`);
  }
  function stop() {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    if (timer.current) clearInterval(timer.current);
    watch.current = null; timer.current = null; setMode("off");
  }
  function start() {
    if (!("geolocation" in navigator)) return;
    let lastSent = 0;
    watch.current = navigator.geolocation.watchPosition((p) => { if (Date.now() - lastSent > 30000) { lastSent = Date.now(); void send(p.coords.latitude, p.coords.longitude, p.coords.accuracy, false); } }, (e) => add(`⚠️ ${e.message}`), { enableHighAccuracy: true, maximumAge: 10000 });
    setMode("on");
  }
  function demo() {
    let lat = 47.0465, lng = 21.9189;
    void send(lat, lng, 10, true);
    timer.current = setInterval(() => { lat -= 0.006; lng += 0.04; void send(lat, lng, 10, true); }, 2500);
    setMode("demo");
  }
  async function report(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const fd = new FormData();
    fd.set("litres", form.litres); fd.set("km", form.km); fd.set("station", form.station); fd.set("driver", DRIVER); fd.set("plate", PLATE);
    if (photo) fd.set("photo", photo);
    const r = await fetch("/api/flota/driver-fill", { method: "POST", body: fd });
    setSending(false);
    if (r.ok) { setLastFill({ litres: +form.litres, km: +form.km }); add(t(loc, "driver.sent", { litres: form.litres, km: form.km })); setForm({ litres: "", km: "", station: "" }); setPhoto(null); setOpen(false); }
    else add(`⚠️ ${r.status}`);
  }
  const statusText = mode === "on" ? t(loc, "driver.statusOn") : mode === "demo" ? t(loc, "driver.statusDemo") : t(loc, "driver.statusOff");
  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flota-in rounded-3xl bg-gradient-to-br from-slate-900 to-blue-950 text-white p-5 shadow-lg">
        <div className="text-sm text-blue-200">{t(loc, "driver.subtitle", { plate: PLATE })}</div>
        <div className="text-2xl font-bold">{t(loc, "driver.title", { name: DRIVER })}</div>
        <div className="mt-4 flex items-center gap-2 text-sm"><span className={`w-2.5 h-2.5 rounded-full ${mode === "off" ? "bg-slate-400" : "bg-emerald-400 animate-pulse"}`} />{statusText}</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-3"><div className="text-xs text-blue-200">{t(loc, "driver.kmToday")}</div><div className="text-2xl font-bold tabular-nums">{fmtNum(loc, km, 1)}</div></div>
          <div className="rounded-2xl bg-white/10 p-3"><div className="text-xs text-blue-200">{t(loc, "driver.lastFill")}</div><div className="text-sm font-semibold mt-1">{lastFill ? `${fmtNum(loc, lastFill.litres)} L · ${fmtNum(loc, lastFill.km)} km` : t(loc, "driver.noFill")}</div></div>
        </div>
      </div>

      {mode === "off" && (
        <section className="flota-in-2 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-4 text-sm space-y-3">
          <h2 className="font-semibold">{t(loc, "driver.consentTitle")}</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{t(loc, "driver.consent", { from: `${WORK_START}:00`, to: `${WORK_END}:00` })}</p>
          <label className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-3 cursor-pointer"><input type="checkbox" className="w-6 h-6 accent-blue-700" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span className="font-medium">{t(loc, "driver.agree")}</span></label>
        </section>
      )}

      <div className="grid gap-3">
        {mode === "off" ? (
          <>
            <button disabled={!consent} onClick={start} className={`${btn} h-16 text-lg rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md`}>▶ {t(loc, "driver.start")}</button>
            <button disabled={!consent} onClick={demo} className={`${btn} h-12 rounded-2xl ring-1 ring-slate-300 dark:ring-slate-700 bg-white dark:bg-slate-900`}>{t(loc, "driver.demo")}</button>
          </>
        ) : (
          <button onClick={stop} className={`${btn} h-16 text-lg rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-md`}>■ {t(loc, "driver.stop")}</button>
        )}
        <button onClick={() => setOpen((o) => !o)} className={`${btn} h-14 text-base rounded-2xl bg-blue-700 hover:bg-blue-800 text-white`}>⛽ {t(loc, "driver.report")}</button>
      </div>

      {open && (
        <form onSubmit={report} className="flota-in rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-4 space-y-3">
          <label className="block text-sm font-medium">{t(loc, "driver.photo")}
            <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-3 file:font-semibold file:text-blue-700" />
            <span className="text-xs text-slate-500">{t(loc, "driver.photoHint")}</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">{t(loc, "driver.litres")}<input required inputMode="decimal" type="number" min={1} max={2000} step="0.1" value={form.litres} onChange={(e) => setForm({ ...form, litres: e.target.value })} className={`${input} mt-1 h-12 text-lg`} /></label>
            <label className="text-sm font-medium">{t(loc, "driver.km")}<input required inputMode="numeric" type="number" min={1} value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} className={`${input} mt-1 h-12 text-lg`} /></label>
          </div>
          <label className="block text-sm font-medium">{t(loc, "driver.station")}<input value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} className={`${input} mt-1 h-12`} /></label>
          <button disabled={sending} className={`${btn} w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-base`}>{sending ? "…" : t(loc, "driver.submit")}</button>
        </form>
      )}

      {!inWorkHours() && <p className="text-xs text-amber-700 dark:text-amber-400 text-center">{t(loc, "driver.outside")}</p>}
      <p className="text-xs text-slate-500 text-center">{t(loc, "driver.iosNote")}</p>
      {log.length > 0 && <div className="rounded-2xl bg-slate-100 dark:bg-slate-900 p-3"><div className="text-xs font-semibold text-slate-500 mb-1">{t(loc, "driver.log")}</div><ul className="text-xs font-mono space-y-0.5">{log.map((l, i) => <li key={i}>{l}</li>)}</ul></div>}
    </div>
  );
}
