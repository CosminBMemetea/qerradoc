// Funcții sigure de interogare a flotei. Le folosesc panoul, raportul zilnic și asistentul AI
// (modelul poate alege doar dintre acestea; cifrele din răspuns vin numai de aici).
import { DEMO_DAY, DEMO_NOW_MIN, positionAt, type Status, type Truck } from "./data";
import { avgL100, computeAlerts, fillsFor, intervals, type Alert, type FleetData } from "./rules";

export type Period = "month" | "30d" | "week" | "yesterday";
export const PERIOD_START: Record<Period, string> = { month: "2026-10-01", "30d": "2026-09-15", week: "2026-10-08", yesterday: "2026-10-14" };
const PERIOD_END: Record<Period, string> = { month: "2026-10-16", "30d": "2026-10-16", week: "2026-10-16", yesterday: "2026-10-15" };
const inPeriod = (iso: string, p: Period) => iso >= PERIOD_START[p] && iso < PERIOD_END[p];
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function findTruck(d: FleetData, q: string | undefined): Truck | undefined {
  if (!q) return undefined;
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const n = norm(q);
  return d.trucks.find((t) => norm(t.plate) === n || t.id.toUpperCase() === n) ?? d.trucks.find((t) => n.length >= 4 && norm(t.plate).includes(n));
}

export function fleetTotals(d: FleetData, period: Period = "month") {
  const fs = d.fills.filter((f) => inPeriod(f.time, period));
  const iv = d.trucks.flatMap((t) => intervals(d, t)).filter((i) => inPeriod(i.to.time, period));
  const km = iv.reduce((s, i) => s + i.km, 0);
  return { period, litres: fs.reduce((s, f) => s + f.litres, 0), cost: r2(fs.reduce((s, f) => s + f.priceLei, 0)), fills: fs.length, avgL100: km ? r1((iv.reduce((s, i) => s + i.litres, 0) / km) * 100) : 0 };
}

export function topConsumers(d: FleetData, period: Period = "month", limit = 3) {
  return d.trucks.map((t) => {
    const iv = intervals(d, t).filter((i) => inPeriod(i.to.time, period));
    const km = iv.reduce((s, i) => s + i.km, 0), l = iv.reduce((s, i) => s + i.litres, 0);
    const l100 = km ? r1((l / km) * 100) : 0;
    return { truckId: t.id, plate: t.plate, l100, normal: t.normalL100, overNormal: l100 ? r2(l100 / t.normalL100 - 1) : 0, litres: l, km };
  }).filter((x) => x.km > 0).sort((a, b) => b.overNormal - a.overNormal).slice(0, Math.max(1, Math.min(8, limit)));
}

export function truckSummary(d: FleetData, plate: string) {
  const t = findTruck(d, plate);
  if (!t) return null;
  const p = positionAt(t, DEMO_NOW_MIN);
  const fs = fillsFor(d, t.id);
  return { truckId: t.id, plate: t.plate, model: t.model, driver: t.driver.split(" ")[0], status: p.status as Status, place: p.place, avgL100: avgL100(d, t), normal: t.normalL100, fills: fs.length, litres: fs.reduce((s, f) => s + f.litres, 0), alerts: computeAlerts(d).filter((a) => a.truckId === t.id).length };
}

export function alertsInRange(d: FleetData, from: string = PERIOD_START.week, to: string = "2026-10-16", onlyTheft = false): Alert[] {
  return computeAlerts(d).filter((a) => a.time >= from && a.time < to + (to.length === 10 ? "T99" : "") && (!onlyTheft || a.theft));
}

export function costPerKm(d: FleetData, plate?: string) {
  const rows = d.trucks.filter((t) => !plate || t.id === findTruck(d, plate)?.id).map((t) => {
    const iv = intervals(d, t);
    const km = iv.reduce((s, i) => s + i.km, 0);
    const cost = iv.reduce((s, i) => s + i.to.priceLei, 0);
    return { truckId: t.id, plate: t.plate, km, cost: r2(cost), perKm: km ? r2(cost / km) : 0 };
  });
  return rows.sort((a, b) => b.perKm - a.perKm);
}

export function fillsBy(d: FleetData, plate?: string, station?: string, limit = 5) {
  const t = plate ? findTruck(d, plate) : undefined;
  if (plate && !t) return [];
  const st = station?.toLowerCase();
  return d.fills.filter((f) => (!t || f.truckId === t.id) && (!st || f.station.toLowerCase().includes(st)))
    .slice().reverse().slice(0, Math.max(1, Math.min(10, limit)))
    .map((f) => ({ truckId: f.truckId, plate: d.trucks.find((x) => x.id === f.truckId)!.plate, time: f.time, station: f.station, litres: f.litres, cost: f.priceLei }));
}

export function movingNow(d: FleetData) {
  return d.trucks.map((t) => ({ truckId: t.id, plate: t.plate, ...positionAt(t, DEMO_NOW_MIN) })).filter((x) => x.status === "moving");
}
export const NOW_LABEL = `${DEMO_DAY}T14:00`;
