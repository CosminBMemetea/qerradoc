// Querra Flotă — DATE DEMO simulate, generate determinist (fără backend).
// Toate valorile sunt inventate; nu provin de la niciun camion real.

export type LatLng = [number, number];
export interface Waypoint { name: string; at: LatLng }
export interface Truck {
  id: string; plate: string; model: string; driver: string;
  tankL: number; normalL100: number; routeName: string;
  route: Waypoint[]; hasLevelSensor: boolean; depMin: number;
}
export interface FillUp {
  id: string; truckId: string; time: string; station: string; stationAt: LatLng;
  gpsAt: LatLng; litres: number; gpsKmSincePrev?: number;
  /** precizia coordonatelor stației (km); import CSV la nivel de oraș = 25 */
  stationPrecisionKm?: number; priceLei: number; odometerKm: number; card: string;
}
export interface LevelPoint { min: number; levelL: number; moving: boolean }

export const DEMO_DAY = "2026-10-15";
export const DEMO_NOW_MIN = 14 * 60; // „acum” în demo: 15 oct 2026, 14:00
export const CONSUMPTION_THRESHOLD = 0.15; // +15% peste normal => alertă consum
export const THEFT_AVG_THRESHOLD = 0.25; // +25% peste media proprie 30 zile => suspiciune
export const STATION_MAX_KM = 5; // GPS mai departe de stație => suspiciune
export const PARKED_DROP_L = 25; // scădere în rezervor cu camionul oprit

const C: Record<string, LatLng> = {
  Oradea: [47.0465, 21.9189], "Cluj-Napoca": [46.7712, 23.6236], Turda: [46.5675, 23.7849],
  Sibiu: [45.7983, 24.1256], Dej: [47.1417, 23.8745], "Baia Mare": [47.6567, 23.585],
  "Timișoara": [45.7489, 21.2087], Arad: [46.1866, 21.3123], "Nădlac": [46.1667, 20.75],
  Szeged: [46.253, 20.1414], Kecskemét: [46.9062, 19.6913], Budapesta: [47.4979, 19.0402],
  "București": [44.4268, 26.1025], "Pitești": [44.8565, 24.8692], "Râmnicu Vâlcea": [45.1047, 24.3756],
  Deva: [45.8833, 22.9], "Sebeș": [45.9583, 23.5681], "Alba Iulia": [46.0667, 23.5833],
  "Borș": [47.1167, 21.8167], Debrecen: [47.5316, 21.6273], "Târgu Mureș": [46.5455, 24.5625],
  "Brașov": [45.6427, 25.5887], "Ploiești": [44.9416, 26.0136], Sighișoara: [46.2197, 24.7964],
};
const r = (...names: string[]): Waypoint[] => names.map((name) => ({ name, at: C[name] }));

export const TRUCKS: Truck[] = [
  { id: "bh21qrt", plate: "BH 21 QRT", model: "Volvo FH 500", driver: "Ioan Pop", tankL: 600, normalL100: 29, routeName: "Oradea → Cluj → Sibiu", route: r("Oradea", "Cluj-Napoca", "Turda", "Sibiu"), hasLevelSensor: true, depMin: 6 * 60 },
  { id: "cj08qrt", plate: "CJ 08 QRT", model: "Scania R450", driver: "Mihai Rus", tankL: 500, normalL100: 30, routeName: "Cluj → Dej → Baia Mare", route: r("Cluj-Napoca", "Dej", "Baia Mare"), hasLevelSensor: false, depMin: 9 * 60 },
  { id: "tm33qrt", plate: "TM 33 QRT", model: "MAN TGX 18.470", driver: "Adrian Stan", tankL: 580, normalL100: 30, routeName: "Timișoara → Arad → Budapesta", route: r("Timișoara", "Arad", "Nădlac", "Szeged", "Kecskemét", "Budapesta"), hasLevelSensor: false, depMin: 5 * 60 },
  { id: "b120qrt", plate: "B 120 QRT", model: "DAF XF 480", driver: "Cristian Ene", tankL: 400, normalL100: 31, routeName: "București → Pitești → Sibiu", route: r("București", "Pitești", "Râmnicu Vâlcea", "Sibiu"), hasLevelSensor: false, depMin: 7 * 60 },
  { id: "ar45qrt", plate: "AR 45 QRT", model: "Iveco S-Way 480", driver: "Florin Micle", tankL: 450, normalL100: 30, routeName: "Arad → Deva → Alba Iulia", route: r("Arad", "Deva", "Sebeș", "Alba Iulia"), hasLevelSensor: true, depMin: 24 * 60 },
  { id: "bh77qrt", plate: "BH 77 QRT", model: "Mercedes Actros 1845", driver: "Gabriel Tóth", tankL: 600, normalL100: 28, routeName: "Oradea → Debrecen → Budapesta", route: r("Oradea", "Borș", "Debrecen", "Budapesta"), hasLevelSensor: false, depMin: 8 * 60 },
  { id: "cj52qrt", plate: "CJ 52 QRT", model: "Renault T 480", driver: "Vasile Moldovan", tankL: 500, normalL100: 31, routeName: "Cluj → Târgu Mureș → Brașov", route: r("Cluj-Napoca", "Târgu Mureș", "Sighișoara", "Brașov"), hasLevelSensor: false, depMin: 6 * 60 + 30 },
  { id: "bv19qrt", plate: "BV 19 QRT", model: "Scania S500", driver: "Radu Neagu", tankL: 600, normalL100: 29, routeName: "Brașov → Ploiești → București", route: r("Brașov", "Ploiești", "București"), hasLevelSensor: false, depMin: 12 * 60 + 25 },
];

// ---------- utilitare ----------
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const pad = (n: number) => String(n).padStart(2, "0");
function dayStr(offsetFromDemoDay: number): string {
  const d = new Date(Date.UTC(2026, 9, 15 + offsetFromDemoDay));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
export const minToHHMM = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(Math.floor(m % 60))}`;

// ---------- traseu & poziție în ziua demo ----------
const ROAD_FACTOR = 1.25; // drum real ≈ 1,25 × linia dreaptă
/** Cursă dus-întors: traseul plus drumul înapoi. */
const fullRoute = (t: Truck): Waypoint[] => [...t.route, ...t.route.slice(0, -1).reverse()];
export function routeKm(t: Truck): number[] {
  const R = fullRoute(t);
  const cum = [0];
  for (let i = 1; i < R.length; i++) cum.push(cum[i - 1] + haversineKm(R[i - 1].at, R[i].at) * ROAD_FACTOR);
  return cum;
}
function pointAtKm(t: Truck, km: number): LatLng {
  const cum = routeKm(t);
  const R = fullRoute(t);
  const total = cum[cum.length - 1];
  const k = Math.max(0, Math.min(total, km));
  for (let i = 1; i < cum.length; i++) {
    if (k <= cum[i]) {
      const f = (k - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      const a = R[i - 1].at, b = R[i].at;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
  }
  return R[R.length - 1].at;
}
export function nearestWaypoint(t: Truck, p: LatLng): Waypoint {
  return t.route.reduce((best, w) => (haversineKm(w.at, p) < haversineKm(best.at, p) ? w : best));
}

export type Status = "moving" | "stopped" | "pump";
interface Phase { kind: "stop" | "drive" | "pump" | "break"; start: number; end: number; kmStart: number; kmEnd: number }
const SPEED = 64; // km/h medie

export function dayPlan(t: Truck): Phase[] {
  const total = routeKm(t).slice(-1)[0];
  const phases: Phase[] = [];
  let m = t.depMin, km = 0;
  phases.push({ kind: "stop", start: 0, end: Math.min(m, 1440), kmStart: 0, kmEnd: 0 });
  if (m >= 1440) return phases;
  const legs: [number, Phase["kind"], number][] = [[0.25, "pump", 25], [0.5, "break", 75], [0.75, "break", 45], [1, "stop", 0]];
  for (const [frac, kind, dur] of legs) {
    const target = total * frac;
    const end = m + ((target - km) / SPEED) * 60;
    phases.push({ kind: "drive", start: m, end, kmStart: km, kmEnd: target });
    m = end; km = target;
    phases.push({ kind, start: m, end: kind === "stop" ? 1e9 : m + dur, kmStart: km, kmEnd: km });
    m += dur;
  }
  return phases;
}

export interface Position { at: LatLng; status: Status; speedKmh: number; place: string }
export function positionAt(t: Truck, minute: number): Position {
  const ph = dayPlan(t).find((p) => minute >= p.start && minute < p.end) ?? dayPlan(t).slice(-1)[0];
  let km = ph.kmStart;
  if (ph.kind === "drive") km = ph.kmStart + ((minute - ph.start) / (ph.end - ph.start)) * (ph.kmEnd - ph.kmStart);
  const at = pointAtKm(t, km);
  const status: Status = ph.kind === "drive" ? "moving" : ph.kind === "pump" ? "pump" : "stopped";
  return { at, status, speedKmh: status === "moving" ? SPEED : 0, place: nearestWaypoint(t, at).name };
}

// ---------- alimentări (30 zile) ----------
const BRANDS = ["OMV", "MOL", "Petrom", "Rompetrol", "Lukoil", "Shell"];
const CARDS = ["DKV", "OMV Routex", "MOL Card"];

function buildFills(): FillUp[] {
  const out: FillUp[] = [];
  TRUCKS.forEach((t, ti) => {
    const rnd = mulberry32(1000 + ti * 77);
    let odo = 180000 + Math.floor(rnd() * 400000);
    let day = -30 + Math.floor(rnd() * 2);
    let n = 0;
    while (day < 0) {
      const gap = 1 + Math.floor(rnd() * 2); // la 1–2 zile
      day += gap;
      if (day >= 0) break;
      const fill = t.id === "cj52qrt" && n === 7 ? 0.6 : 0.55 + rnd() * 0.25; // cât din rezervor se consumă
      const km = Math.round((t.tankL * fill * 100) / t.normalL100);
      odo += km;
      let factor = 1 + (rnd() - 0.5) * 0.08; // ±4% zgomot normal
      // CJ 08: ușor peste normal în ultimele 2 intervale (doar alertă consum)
      if (t.id === "cj08qrt" && day >= -5) factor = 1.19;
      // CJ 52: un interval cu consum mult peste medie (suspiciune furt, regula c)
      if (t.id === "cj52qrt" && n === 7) factor = 1.45;
      let litres = Math.round((km * t.normalL100 * factor) / 100);
      const wp = t.route[Math.floor(rnd() * t.route.length)];
      const stationAt: LatLng = [wp.at[0] + 0.012, wp.at[1] - 0.01];
      const gpsAt: LatLng = [stationAt[0] + (rnd() - 0.5) * 0.004, stationAt[1] + (rnd() - 0.5) * 0.004];
      // B 120: alimentare peste capacitatea rezervorului (regula c)
      if (t.id === "b120qrt" && n === 6) litres = 520;
      const time = `${dayStr(day)}T${pad(6 + Math.floor(rnd() * 13))}:${pad(Math.floor(rnd() * 60))}`;
      // CJ 08: odometru declarat la pompă umflat față de km GPS (regula km-nepotrivit)
      const gpsKm = t.id === "cj08qrt" && n === 4 ? Math.round(km * 0.6) : Math.round(km * (0.98 + rnd() * 0.03));
      out.push({ id: `${t.id}-${n}`, truckId: t.id, time, gpsKmSincePrev: n > 0 ? gpsKm : undefined, station: `${BRANDS[(ti + n) % BRANDS.length]} ${wp.name}`, stationAt, gpsAt, litres, priceLei: Math.round(litres * (7.18 + rnd() * 0.3) * 100) / 100, odometerKm: odo, card: CARDS[ti % CARDS.length] });
      n++;
      // TM 33: tranzacție pe card la Nădlac, dar camionul era lângă Budapesta (regula a)
      if (t.id === "tm33qrt" && n === 5) {
        const nad = C["Nădlac"];
        const st: LatLng = [nad[0] + 0.012, nad[1] - 0.01];
        out.push({ id: `${t.id}-x`, truckId: t.id, time: `${dayStr(day)}T22:47`, station: "MOL Nădlac", stationAt: st, gpsAt: [47.43, 19.18], litres: 310, priceLei: 2263.0, odometerKm: odo, card: CARDS[ti % CARDS.length] });
      }
    }
    // alimentarea din ziua demo, la oprirea „la pompă”
    const pump = dayPlan(t).find((p) => p.kind === "pump");
    if (pump && pump.start < DEMO_NOW_MIN) {
      const at = pointAtKm(t, pump.kmStart);
      const prev = out.filter((f) => f.truckId === t.id).slice(-1)[0];
      const km = Math.round(pump.kmStart + 360);
      const litres = Math.round((km * t.normalL100) / 100);
      out.push({ id: `${t.id}-today`, truckId: t.id, time: `${DEMO_DAY}T${minToHHMM(pump.start + 8)}`, station: `${BRANDS[ti % BRANDS.length]} ${nearestWaypoint(t, at).name} (traseu)`, stationAt: at, gpsAt: at, litres, priceLei: Math.round(litres * 7.31 * 100) / 100, odometerKm: (prev?.odometerKm ?? 0) + km, card: CARDS[ti % CARDS.length] });
    }
  });
  return out.sort((a, b) => a.time.localeCompare(b.time));
}
export const FILLS: FillUp[] = buildFills();

// ---------- senzor nivel rezervor (VIITOR, simulat) ----------
export function levelSeries(t: Truck): LevelPoint[] | null {
  if (!t.hasLevelSensor) return null;
  const pts: LevelPoint[] = [];
  let level = Math.round(t.tankL * 0.68);
  const rnd = mulberry32(t.tankL + 5);
  for (let m = 0; m <= DEMO_NOW_MIN; m += 10) {
    const pos = positionAt(t, m);
    const moving = pos.status === "moving";
    if (moving) level -= (SPEED / 6) * (t.normalL100 / 100);
    if (pos.status === "pump" && m >= dayPlan(t).find((p) => p.kind === "pump")!.start + 10 && level < t.tankL * 0.6) level = t.tankL * 0.95;
    // AR 45 parcat: scădere bruscă de ~80 L între 02:40 și 03:00, contact oprit (regula b)
    if (t.id === "ar45qrt" && m > 160 && m <= 180) level -= 40;
    pts.push({ min: m, levelL: Math.round(level + (rnd() - 0.5) * 2), moving });
  }
  return pts;
}

export const truckById = (id: string) => TRUCKS.find((t) => t.id === id);
