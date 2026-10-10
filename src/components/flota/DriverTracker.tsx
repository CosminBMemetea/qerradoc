"use client";
import { useEffect, useRef, useState } from "react";

const WORK_START = 6, WORK_END = 22; // program de lucru (ora locală)
const inWorkHours = (d = new Date()) => d.getHours() >= WORK_START && d.getHours() < WORK_END;

export default function DriverTracker() {
  const [consent, setConsent] = useState(false);
  const [driver, setDriver] = useState("Șofer demo");
  const [plate, setPlate] = useState("BH 21 QRT");
  const [state, setState] = useState<"oprit" | "activ" | "demo">("oprit");
  const [log, setLog] = useState<string[]>([]);
  const watch = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const add = (s: string) => setLog((l) => [`${new Date().toLocaleTimeString("ro-RO")} ${s}`, ...l].slice(0, 8));

  async function send(lat: number, lng: number, accuracy: number, demo: boolean) {
    if (!inWorkHours()) { add("În afara programului: nu trimit poziția."); return; }
    const r = await fetch("/api/flota/positions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lat, lng, accuracy, driver, plate, consent: true, demo }) });
    add(r.ok ? `Trimis ${lat.toFixed(4)}, ${lng.toFixed(4)}${demo ? " (demo)" : ""}` : `Eroare server ${r.status}`);
  }
  function stop() {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    if (timer.current) clearInterval(timer.current);
    watch.current = null; timer.current = null; setState("oprit");
  }
  function startReal() {
    if (!("geolocation" in navigator)) { add("Telefonul nu oferă localizare."); return; }
    let last = 0;
    watch.current = navigator.geolocation.watchPosition(
      (p) => { if (Date.now() - last > 30000) { last = Date.now(); void send(p.coords.latitude, p.coords.longitude, p.coords.accuracy, false); } },
      (e) => add(`Localizare refuzată sau indisponibilă (${e.message}).`),
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    setState("activ");
  }
  function startDemo() {
    let lat = 47.0465, lng = 21.9189; // pornește din Oradea spre Cluj
    void send(lat, lng, 10, true);
    timer.current = setInterval(() => { lat -= 0.006; lng += 0.04; void send(lat, lng, 10, true); }, 3000);
    setState("demo");
  }
  useEffect(() => () => stop(), []);

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-xl border border-slate-200 p-4 text-sm space-y-2">
        <h2 className="font-bold">Informare și acord</h2>
        <p>Firma ta folosește poziția acestui telefon ca să vadă unde e camionul și să verifice alimentările. Poziția se trimite <b>doar cât timp pagina e deschisă</b> și <b>doar în programul de lucru ({WORK_START}:00–{WORK_END}:00)</b>. Nu se colectează nimic în pauze, concediu sau în afara programului. Datele se păstrează limitat și le vede doar firma. Poți opri oricând.</p>
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Am citit informarea și sunt de acord.</label>
      </section>
      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label>Șofer<input value={driver} onChange={(e) => setDriver(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1.5" /></label>
          <label>Camion<input value={plate} onChange={(e) => setPlate(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1.5" /></label>
        </div>
        {state === "oprit" ? (
          <div className="flex flex-col gap-2">
            <button disabled={!consent} onClick={startReal} className="py-3 rounded-lg bg-blue-900 text-white font-semibold disabled:opacity-40">Pornește tura (GPS telefon)</button>
            <button disabled={!consent} onClick={startDemo} className="py-3 rounded-lg border border-blue-900 text-blue-900 font-semibold disabled:opacity-40">Mod demo (poziții simulate)</button>
          </div>
        ) : (
          <button onClick={stop} className="w-full py-3 rounded-lg bg-red-600 text-white font-semibold">Oprește ({state === "demo" ? "demo" : "GPS activ"})</button>
        )}
        {!inWorkHours() && <p className="text-xs text-amber-700">Acum ești în afara programului: nu se trimite nimic.</p>}
        <p className="text-xs text-slate-500">Pe iPhone, browserul oprește localizarea când ecranul se blochează. Pentru urmărire continuă e nevoie de aplicație nativă (plan ulterior).</p>
        <ul className="text-xs font-mono text-slate-600 space-y-0.5">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
      </section>
    </div>
  );
}
