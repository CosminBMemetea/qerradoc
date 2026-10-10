import {
  CONSUMPTION_THRESHOLD, DEMO_DAY, PARKED_DROP_L, STATION_MAX_KM, THEFT_AVG_THRESHOLD,
  type FillUp, type LevelPoint, type Truck, haversineKm, minToHHMM,
} from "./data";
import { fmtDate, fmtNum, t, type Locale, type MsgKey } from "./i18n";

/** Intrarea regulilor: orice depozit (demo în memorie sau Postgres) o poate furniza. */
export interface FleetData { trucks: Truck[]; fills: FillUp[]; levels: Record<string, LevelPoint[] | null> }
export const KM_MISMATCH = 0.2;

export type Severity = "high" | "medium" | "low";
export type RuleId = "km-nepotrivit" | "card-fara-camion" | "scadere-parcat" | "peste-capacitate" | "consum-peste-medie" | "consum-peste-normal";
export const RULES: RuleId[] = ["km-nepotrivit", "card-fara-camion", "scadere-parcat", "peste-capacitate", "consum-peste-medie", "consum-peste-normal"];
/** Parametri structurați; textul „De ce” se generează pe limbă la afișare. */
export type AlertParams = Record<string, string | number>;
export interface Alert { id: string; rule: RuleId; truckId: string; time: string; severity: Severity; theft: boolean; params: AlertParams }

export interface Interval { from: FillUp; to: FillUp; km: number; litres: number; l100: number }
export const fillsFor = (d: FleetData, truckId: string) => d.fills.filter((f) => f.truckId === truckId);
const atPump = (f: FillUp) => haversineKm(f.gpsAt, f.stationAt) <= STATION_MAX_KM;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Consum pe interval (plin-la-plin): litrii puși la alimentarea curentă / km de la cea anterioară. */
export function intervals(d: FleetData, t: Truck): Interval[] {
  const fs = fillsFor(d, t.id).filter(atPump);
  const out: Interval[] = [];
  for (let i = 1; i < fs.length; i++) {
    const km = fs[i].odometerKm - fs[i - 1].odometerKm;
    if (km < 50) continue;
    out.push({ from: fs[i - 1], to: fs[i], km, litres: fs[i].litres, l100: r1((fs[i].litres / km) * 100) });
  }
  return out;
}
export function avgL100(d: FleetData, t: Truck): number {
  const iv = intervals(d, t);
  const km = iv.reduce((s, i) => s + i.km, 0), l = iv.reduce((s, i) => s + i.litres, 0);
  return km ? r1((l / km) * 100) : 0;
}

/** Reguli pe o singură tranzacție (folosite și la importul CSV). */
export function checkFill(t: Truck, f: FillUp, prev: FillUp | null, avg: number): Omit<Alert, "id" | "truckId">[] {
  const out: Omit<Alert, "id" | "truckId">[] = [];
  const base = { time: f.time, severity: "high" as Severity, theft: true };
  if (prev && f.gpsKmSincePrev) {
    const declared = f.odometerKm - prev.odometerKm;
    if (declared > 50 && Math.abs(declared - f.gpsKmSincePrev) / f.gpsKmSincePrev > KM_MISMATCH)
      out.push({ ...base, rule: "km-nepotrivit", params: { station: f.station, time: f.time, declared, odoFrom: prev.odometerKm, odoTo: f.odometerKm, gpsKm: f.gpsKmSincePrev, litres: f.litres, realL100: r1((f.litres / f.gpsKmSincePrev) * 100), declaredL100: r1((f.litres / declared) * 100), threshold: KM_MISMATCH * 100 } });
  }
  const dist = haversineKm(f.gpsAt, f.stationAt);
  if (dist > (f.stationPrecisionKm ?? STATION_MAX_KM))
    out.push({ ...base, rule: "card-fara-camion", params: { card: f.card, litres: f.litres, station: f.station, time: f.time, plate: t.plate, dist: Math.round(dist), threshold: f.stationPrecisionKm ?? STATION_MAX_KM } });
  if (f.litres > t.tankL)
    out.push({ ...base, rule: "peste-capacitate", params: { station: f.station, time: f.time, litres: f.litres, plate: t.plate, tank: t.tankL, excess: f.litres - t.tankL } });
  // litri vs km (din GPS dacă există, altfel din bord)
  if (prev && avg) {
    const km = f.gpsKmSincePrev ?? f.odometerKm - prev.odometerKm;
    if (km >= 50) {
      const l100 = r1((f.litres / km) * 100);
      if (l100 > avg * (1 + THEFT_AVG_THRESHOLD))
        out.push({ ...base, rule: "consum-peste-medie", params: { time: f.time, station: f.station, litres: f.litres, km, fromTime: prev.time, l100, pct: Math.round((l100 / avg - 1) * 100), avg, threshold: THEFT_AVG_THRESHOLD * 100 } });
    }
  }
  return out;
}

export function computeAlerts(d: FleetData): Alert[] {
  const out: Alert[] = [];
  for (const t of d.trucks) {
    const tf = fillsFor(d, t.id);
    const avg = avgL100(d, t);
    tf.forEach((f, idx) => {
      for (const a of checkFill(t, { ...f, gpsKmSincePrev: f.gpsKmSincePrev }, idx > 0 ? tf[idx - 1] : null, 0))
        out.push({ ...a, id: `${a.rule}-${f.id}`, truckId: t.id });
    });
    for (const iv of intervals(d, t)) {
      if (iv.l100 > avg * (1 + THEFT_AVG_THRESHOLD))
        out.push({ id: `m-${iv.to.id}`, rule: "consum-peste-medie", truckId: t.id, time: iv.to.time, severity: "high", theft: true, params: { time: iv.to.time, station: iv.to.station, litres: iv.litres, km: iv.km, fromTime: iv.from.time, l100: iv.l100, pct: Math.round((iv.l100 / avg - 1) * 100), avg, threshold: THEFT_AVG_THRESHOLD * 100 } });
      else if (iv.l100 > t.normalL100 * (1 + CONSUMPTION_THRESHOLD))
        out.push({ id: `n-${iv.to.id}`, rule: "consum-peste-normal", truckId: t.id, time: iv.to.time, severity: "medium", theft: false, params: { fromTime: iv.from.time, time: iv.to.time, l100: iv.l100, pct: Math.round((iv.l100 / t.normalL100 - 1) * 100), normal: t.normalL100, threshold: CONSUMPTION_THRESHOLD * 100 } });
    }
    const lv = d.levels[t.id];
    if (lv) {
      for (let i = 0; i < lv.length; i++) {
        const j = lv.findIndex((p) => p.min > lv[i].min + 30) - 1;
        let end = j >= 0 ? lv[j] : lv[lv.length - 1];
        const win = lv.slice(i, j >= 0 ? j + 1 : lv.length);
        if (lv[i].levelL - end.levelL >= PARKED_DROP_L && win.every((p) => !p.moving)) {
          for (let k = lv.indexOf(end) + 1; k < lv.length && !lv[k].moving && lv[k].levelL < end.levelL - 2; k++) end = lv[k];
          out.push({ id: `b-${t.id}-${lv[i].min}`, rule: "scadere-parcat", truckId: t.id, time: `${DEMO_DAY}T${minToHHMM(lv[i].min)}`, severity: "high", theft: true, params: { drop: lv[i].levelL - end.levelL, from: minToHHMM(lv[i].min), to: minToHHMM(end.min), plate: t.plate, threshold: PARKED_DROP_L } });
          i = lv.indexOf(end);
        }
      }
    }
  }
  const rank: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || b.time.localeCompare(a.time));
}

// ---------- text pe limbă ----------
const DECIMALS: Record<string, number> = { realL100: 1, declaredL100: 1, l100: 1, avg: 1, normal: 1 };
const DATE_KEYS = new Set(["time", "fromTime"]);
const PLAIN = new Set(["station", "card", "plate", "from", "to"]);
export function whyText(loc: Locale, a: Pick<Alert, "rule" | "params">): string {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(a.params)) {
    if (DATE_KEYS.has(k) && typeof v === "string") vars[k] = fmtDate(loc, v);
    else if (typeof v === "number" && !PLAIN.has(k)) vars[k] = fmtNum(loc, v, DECIMALS[k] ?? 0);
    else vars[k] = String(v);
  }
  return t(loc, `why.${a.rule}` as MsgKey, vars);
}
export const ruleTitle = (loc: Locale, r: RuleId) => t(loc, `rule.${r}` as MsgKey);
