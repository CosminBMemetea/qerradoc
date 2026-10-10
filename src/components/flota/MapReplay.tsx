"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DEMO_NOW_MIN, minToHHMM, type Status } from "@/lib/flota/data";
import { STATUS_COLOR } from "./colors";

export interface MapTruck { id: string; plate: string; driver: string; routeName: string; route: [number, number][] }
export interface MapPoint { min: number; lat: number; lng: number; status: Status; place: string }
interface Payload { trucks: MapTruck[]; track: Record<string, MapPoint[]>; driverPings: { id: string; driver: string; lat: number; lng: number; demo: boolean }[] }

const FleetMap = dynamic(() => import("./FleetMap"), { ssr: false });
const Placeholder = ({ h }: { h: number }) => <div style={{ height: h }} className="rounded-xl bg-slate-200 animate-pulse" />;

/** Hartă cu poziții luate de la server (/api/flota/positions) și cursor pentru reluarea zilei. */
export default function MapReplay({ onlyId, height = 480 }: { onlyId?: string; height?: number }) {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState(false);
  const [minute, setMinute] = useState(DEMO_NOW_MIN);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    fetch(`/api/flota/positions${onlyId ? `?truck=${onlyId}` : ""}`).then((r) => r.json()).then(setData).catch(() => setErr(true));
  }, [onlyId]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setMinute((m) => (m >= DEMO_NOW_MIN ? (setPlaying(false), m) : m + 5)), 120);
    return () => clearInterval(id);
  }, [playing]);
  const points: Record<string, MapPoint | undefined> = {};
  if (data) for (const t of data.trucks) points[t.id] = data.track[t.id]?.[Math.floor(minute / 5)];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3">
        <button onClick={() => { if (minute >= DEMO_NOW_MIN) setMinute(0); setPlaying((p) => !p); }} className="px-3 py-1.5 rounded-md bg-blue-900 text-white text-sm font-semibold w-24">{playing ? "Pauză" : "▶ Redă ziua"}</button>
        <input aria-label="Ora" type="range" min={0} max={DEMO_NOW_MIN} step={5} value={minute} onChange={(e) => { setPlaying(false); setMinute(+e.target.value); }} className="flex-1 accent-blue-900" />
        <span className="font-mono font-bold w-28 text-right">15.10 {minToHHMM(minute)}</span>
      </div>
      {err ? <div className="p-4 bg-red-50 rounded-xl text-sm">Nu am putut încărca pozițiile de la server.</div>
        : data ? <FleetMap trucks={data.trucks} points={points} single={!!onlyId} height={height} pings={data.driverPings} /> : <Placeholder h={height} />}
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        {Object.entries(STATUS_COLOR).map(([s, c]) => <span key={s} className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{ background: c }} />{s}</span>)}
        {!onlyId && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-violet-400" />telefon șofer (/flota/sofer)</span>}
        <span>Linie punctată = traseul zilei (aproximat în linie dreaptă între orașe)</span>
      </div>
      {!onlyId && data && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {data.trucks.map((t) => { const p = points[t.id]; return p && (
            <Link key={t.id} href={`/flota/camion/${t.id}`} className="bg-white border border-slate-200 rounded-lg p-2 text-sm hover:border-blue-400">
              <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: STATUS_COLOR[p.status] }} /><b>{t.plate}</b> · {p.status} · {p.place}
            </Link>); })}
        </div>
      )}
    </div>
  );
}
