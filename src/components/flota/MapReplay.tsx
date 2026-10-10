"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DEMO_DAY, DEMO_NOW_MIN, minToHHMM, type Status } from "@/lib/flota/data";
import { fmtDate, t, type Locale } from "@/lib/flota/i18n";
import { STATUS_COLOR } from "./colors";
import { Skeleton, btnPrimary } from "./ui";

export interface MapTruck { id: string; plate: string; driver: string; routeName: string; route: [number, number][] }
export interface MapPoint { min: number; lat: number; lng: number; status: Status; place: string }
interface Payload { trucks: MapTruck[]; track: Record<string, MapPoint[]>; driverPings: { id: string; driver: string; lat: number; lng: number; demo: boolean }[] }

const FleetMap = dynamic(() => import("./FleetMap"), { ssr: false });

/** Hartă cu poziții de la server (/api/flota/positions), cursor pe zi și panou lateral pentru camion. */
export default function MapReplay({ locale: loc, onlyId, height = 520 }: { locale: Locale; onlyId?: string; height?: number }) {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState(false);
  const [minute, setMinute] = useState(DEMO_NOW_MIN);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(onlyId);
  const onSelect = useCallback((id: string) => setSelected(id), []);
  useEffect(() => {
    fetch(`/api/flota/positions${onlyId ? `?truck=${onlyId}` : ""}`).then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then(setData).catch(() => setErr(true));
  }, [onlyId]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setMinute((m) => (m >= DEMO_NOW_MIN ? (setPlaying(false), m) : m + 5)), 110);
    return () => clearInterval(id);
  }, [playing]);
  const points: Record<string, MapPoint | undefined> = {};
  if (data) for (const tr of data.trucks) points[tr.id] = data.track[tr.id]?.[Math.floor(minute / 5)];
  const sel = data?.trucks.find((x) => x.id === selected);
  const sp = sel ? points[sel.id] : undefined;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-2.5 shadow-sm">
        <button onClick={() => { if (minute >= DEMO_NOW_MIN) setMinute(0); setPlaying((p) => !p); }} className={`${btnPrimary} !px-3 !py-2 min-w-[7.5rem]`}>{playing ? `⏸ ${t(loc, "map.pause")}` : `▶ ${t(loc, "map.play")}`}</button>
        <input aria-label="time" type="range" min={0} max={DEMO_NOW_MIN} step={5} value={minute} onChange={(e) => { setPlaying(false); setMinute(+e.target.value); }} className="flex-1 accent-blue-700" />
        <span className="font-mono font-bold tabular-nums text-sm w-24 text-right">{fmtDate(loc, `${DEMO_DAY}T${minToHHMM(minute)}`)}</span>
      </div>
      <div className="relative">
        {err ? <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950 text-sm">{t(loc, "ui.error")}</div>
          : data ? <FleetMap trucks={data.trucks} points={points} single={!!onlyId} height={height} pings={data.driverPings} selected={selected} onSelect={onSelect} phoneLabel={t(loc, "map.phone")} />
          : <Skeleton className="w-full absolute inset-0" />}
        {!data && !err && <div style={{ height }} />}
        {!onlyId && sel && sp && (
          <aside className="flota-in absolute z-[500] bottom-3 left-3 right-3 sm:left-auto sm:top-3 sm:bottom-auto sm:w-72 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur ring-1 ring-slate-200 dark:ring-slate-700 shadow-xl p-4">
            <div className="flex items-start justify-between"><div><div className="text-lg font-bold">{sel.plate}</div><div className="text-xs text-slate-500">{sel.driver.split(" ")[0]} · {sel.routeName}</div></div>
              <button aria-label={t(loc, "ui.close")} onClick={() => setSelected(undefined)} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">✕</button></div>
            <div className="mt-3 flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[sp.status] }} /><b>{t(loc, `status.${sp.status}`)}</b>{sp.status === "moving" && <span className="text-slate-500">· {t(loc, "map.speed", { v: 64 })}</span>}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">{t(loc, "dash.near", { place: sp.place })}</div>
            <Link href={`/flota/camion/${sel.id}`} className={`${btnPrimary} w-full mt-3`}>{t(loc, "map.openTruck")} →</Link>
          </aside>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {(Object.keys(STATUS_COLOR) as Status[]).map((s) => <span key={s} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />{t(loc, `status.${s}`)}</span>)}
        {!onlyId && <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-400" />{t(loc, "map.phone")}</span>}
        <span>{t(loc, "map.routeNote")}</span>
      </div>
      {!onlyId && (data ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {data.trucks.map((tr) => { const p = points[tr.id]; return p && (
            <button key={tr.id} onClick={() => setSelected(tr.id)} className={`text-left rounded-xl p-2.5 text-sm ring-1 transition ${selected === tr.id ? "ring-blue-500 bg-blue-50 dark:bg-blue-950" : "ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 hover:ring-blue-300"}`}>
              <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: STATUS_COLOR[p.status] }} /><b>{tr.plate}</b> · {t(loc, `status.${p.status}`)} · <span className="text-slate-500">{p.place}</span>
            </button>); })}
        </div>
      ) : <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-11" />)}</div>)}
    </div>
  );
}
