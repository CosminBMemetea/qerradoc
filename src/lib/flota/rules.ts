import {
  CONSUMPTION_THRESHOLD, DEMO_DAY, PARKED_DROP_L, STATION_MAX_KM, THEFT_AVG_THRESHOLD,
  type FillUp, type LevelPoint, type Truck, haversineKm, minToHHMM,
} from "./data";

/** Intrarea regulilor: orice depozit (demo în memorie sau Postgres) o poate furniza. */
export interface FleetData { trucks: Truck[]; fills: FillUp[]; levels: Record<string, LevelPoint[] | null> }
export const KM_MISMATCH = 0.2; // km declarați la pompă vs km GPS de la alimentarea anterioară

export type Severity = "ridicată" | "medie" | "scăzută";
export type RuleId = "km-nepotrivit" | "card-fara-camion" | "scadere-parcat" | "peste-capacitate" | "consum-peste-medie" | "consum-peste-normal";
export interface Alert { id: string; rule: RuleId; title: string; truckId: string; time: string; severity: Severity; why: string; theft: boolean }

export const RULE_LABEL: Record<RuleId, string> = {
  "km-nepotrivit": "Km de pe bon nu se potrivesc cu GPS-ul",
  "card-fara-camion": "Alimentare pe card fără camion la pompă",
  "scadere-parcat": "Scădere bruscă în rezervor, camion parcat",
  "peste-capacitate": "Alimentare peste capacitatea rezervorului",
  "consum-peste-medie": "Litri prea mulți pentru km parcurși",
  "consum-peste-normal": "Consum peste normal",
};

export interface Interval { from: FillUp; to: FillUp; km: number; litres: number; l100: number }

/** Alimentări „valide” pentru consum: cele unde GPS-ul confirmă camionul la pompă. */
export const fillsFor = (d: FleetData, truckId: string) => d.fills.filter((f) => f.truckId === truckId);
const atPump = (f: FillUp) => haversineKm(f.gpsAt, f.stationAt) <= STATION_MAX_KM;

/** Consum pe interval (plin-la-plin): litrii puși la alimentarea curentă / km de la cea anterioară. */
export function intervals(d: FleetData, t: Truck): Interval[] {
  const fs = fillsFor(d, t.id).filter(atPump);
  const out: Interval[] = [];
  for (let i = 1; i < fs.length; i++) {
    const km = fs[i].odometerKm - fs[i - 1].odometerKm;
    if (km < 50) continue;
    out.push({ from: fs[i - 1], to: fs[i], km, litres: fs[i].litres, l100: Math.round((fs[i].litres / km) * 1000) / 10 });
  }
  return out;
}
export function avgL100(d: FleetData, t: Truck): number {
  const iv = intervals(d, t);
  const km = iv.reduce((s, i) => s + i.km, 0), l = iv.reduce((s, i) => s + i.litres, 0);
  return km ? Math.round((l / km) * 1000) / 10 : 0;
}

export function computeAlerts(d: FleetData): Alert[] {
  const out: Alert[] = [];
  for (const t of d.trucks) {
    // a) card folosit, dar GPS-ul camionului era departe de stație
    const tf = fillsFor(d, t.id);
    tf.forEach((f, idx) => {
      // a0) km declarați pe bon/card vs distanța GPS parcursă de la alimentarea anterioară
      const prev = idx > 0 ? tf[idx - 1] : null;
      if (prev && f.gpsKmSincePrev != null) {
        const declared = f.odometerKm - prev.odometerKm;
        if (declared > 50 && Math.abs(declared - f.gpsKmSincePrev) / f.gpsKmSincePrev > KM_MISMATCH) out.push({ id: `k-${f.id}`, rule: "km-nepotrivit", title: RULE_LABEL["km-nepotrivit"], truckId: t.id, time: f.time, severity: "ridicată", theft: true,
          why: `La ${f.station} pe ${fmt(f.time)} s-au declarat ${declared} km de la alimentarea anterioară (bord ${prev.odometerKm} → ${f.odometerKm}), dar GPS-ul a înregistrat doar ${f.gpsKmSincePrev} km. Cu ${f.litres} L, consumul real ar fi ${r1((f.litres / f.gpsKmSincePrev) * 100)} L/100km, nu ${r1((f.litres / declared) * 100)}. Prag: diferență peste ${KM_MISMATCH * 100}%.` });
      }
      const dist = haversineKm(f.gpsAt, f.stationAt);
      if (dist > STATION_MAX_KM) out.push({ id: `a-${f.id}`, rule: "card-fara-camion", title: RULE_LABEL["card-fara-camion"], truckId: t.id, time: f.time, severity: "ridicată", theft: true,
        why: `Cardul ${f.card} a plătit ${f.litres} L la ${f.station} pe ${fmt(f.time)}, dar GPS-ul camionului ${t.plate} arăta în acel moment o poziție la ${Math.round(dist)} km de stație (prag: ${STATION_MAX_KM} km).` });
      // c1) peste capacitate
      if (f.litres > t.tankL) out.push({ id: `c-${f.id}`, rule: "peste-capacitate", title: RULE_LABEL["peste-capacitate"], truckId: t.id, time: f.time, severity: "ridicată", theft: true,
        why: `La ${f.station} pe ${fmt(f.time)} s-au alimentat ${f.litres} L, dar rezervorul lui ${t.plate} are doar ${t.tankL} L. Diferența de cel puțin ${f.litres - t.tankL} L nu putea intra în camion.` });
    });
    // c2) consum mult peste medie + consum peste normal
    const avg = avgL100(d, t);
    for (const iv of intervals(d, t)) {
      if (iv.l100 > avg * (1 + THEFT_AVG_THRESHOLD)) out.push({ id: `m-${iv.to.id}`, rule: "consum-peste-medie", title: RULE_LABEL["consum-peste-medie"], truckId: t.id, time: iv.to.time, severity: "ridicată", theft: true,
        why: `Bonul/tranzacția de pe ${fmt(iv.to.time)} (${iv.to.station}): ${iv.litres} L pentru ${iv.km} km parcurși de la alimentarea din ${fmt(iv.from.time)} = ${iv.l100} L/100km, cu ${pct(iv.l100, avg)} peste media de 30 de zile a camionului (${avg}). Prag: +${THEFT_AVG_THRESHOLD * 100}%.` });
      else if (iv.l100 > t.normalL100 * (1 + CONSUMPTION_THRESHOLD)) out.push({ id: `n-${iv.to.id}`, rule: "consum-peste-normal", title: RULE_LABEL["consum-peste-normal"], truckId: t.id, time: iv.to.time, severity: "medie", theft: false,
        why: `Între ${fmt(iv.from.time)} și ${fmt(iv.to.time)}: ${iv.l100} L/100km, cu ${pct(iv.l100, t.normalL100)} peste normalul camionului (${t.normalL100}). Prag: +${CONSUMPTION_THRESHOLD * 100}%. Poate fi încărcătură, trafic sau o problemă tehnică.` });
    }
    // b) scădere bruscă de nivel cu camionul oprit (senzor viitor)
    const lv = d.levels[t.id];
    if (lv) {
      for (let i = 0; i < lv.length; i++) {
        const j = lv.findIndex((p) => p.min > lv[i].min + 30) - 1;
        const end = j >= 0 ? lv[j] : lv[lv.length - 1];
        const window = lv.slice(i, j >= 0 ? j + 1 : lv.length);
        let end2 = lv[0];
        end2 = end;
        const drop0 = lv[i].levelL - end.levelL;
        if (drop0 >= PARKED_DROP_L && window.every((p) => !p.moving)) {
          for (let k = lv.indexOf(end) + 1; k < lv.length && !lv[k].moving && lv[k].levelL < end2.levelL - 2; k++) end2 = lv[k];
          const drop = lv[i].levelL - end2.levelL;
          out.push({ id: `b-${t.id}-${lv[i].min}`, rule: "scadere-parcat", title: RULE_LABEL["scadere-parcat"], truckId: t.id, time: `${DEMO_DAY}T${minToHHMM(lv[i].min)}`, severity: "ridicată", theft: true,
            why: `Senzorul de nivel (viitor, simulat) arată o scădere de ${drop} L între ${minToHHMM(lv[i].min)} și ${minToHHMM(end2.min)}, iar camionul ${t.plate} era parcat (viteză 0). Prag: ${PARKED_DROP_L} L în 30 de minute.` });
          i = lv.indexOf(end2);
        }
      }
    }
  }
  const rank: Record<Severity, number> = { ridicată: 0, medie: 1, scăzută: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || b.time.localeCompare(a.time));
}

export function fmt(iso: string) {
  const [d, h] = iso.split("T");
  const [, m, day] = d.split("-");
  return `${day}.${m}${h ? " " + h : ""}`;
}
const r1 = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
const pct = (v: number, base: number) => `${Math.round((v / base - 1) * 100)}%`;
