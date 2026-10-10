// Depozitul de date al flotei. Demo-ul folosește datele generate în memoria serverului;
// pentru producție se scrie PostgresFleetRepository cu aceeași interfață (tabele: trucks,
// fuel_transactions, positions, tank_levels) și se schimbă doar getRepo().
import { DEMO_NOW_MIN, FILLS, TRUCKS, levelSeries, positionAt, type FillUp, type LevelPoint, type Status, type Truck } from "./data";
import { computeAlerts, type Alert, type FleetData } from "./rules";

export interface TrackPoint { min: number; lat: number; lng: number; status: Status; place: string }
export interface DriverPing { id: string; driver: string; plate: string; lat: number; lng: number; accuracyM: number; at: string; demo: boolean }

export interface FleetRepository {
  trucks(): Promise<Truck[]>;
  fills(truckId?: string): Promise<FillUp[]>;
  levels(): Promise<Record<string, LevelPoint[] | null>>;
  track(truckId?: string): Promise<Record<string, TrackPoint[]>>;
  addDriverPing(p: Omit<DriverPing, "id" | "at">): Promise<DriverPing>;
  driverPings(): Promise<DriverPing[]>;
}

class DemoFleetRepository implements FleetRepository {
  private pings: DriverPing[] = []; // efemer: se pierde la repornirea funcției
  async trucks() { return TRUCKS; }
  async fills(truckId?: string) { return truckId ? FILLS.filter((f) => f.truckId === truckId) : FILLS; }
  async levels() { return Object.fromEntries(TRUCKS.map((t) => [t.id, levelSeries(t)])); }
  async track(truckId?: string) {
    const out: Record<string, TrackPoint[]> = {};
    for (const t of TRUCKS.filter((x) => !truckId || x.id === truckId)) {
      out[t.id] = [];
      for (let m = 0; m <= DEMO_NOW_MIN; m += 5) { const p = positionAt(t, m); out[t.id].push({ min: m, lat: +p.at[0].toFixed(5), lng: +p.at[1].toFixed(5), status: p.status, place: p.place }); }
    }
    return out;
  }
  async addDriverPing(p: Omit<DriverPing, "id" | "at">) {
    const ping = { ...p, id: Math.random().toString(36).slice(2, 10), at: new Date().toISOString() };
    this.pings = [ping, ...this.pings].slice(0, 200);
    return ping;
  }
  async driverPings() { return this.pings; }
}

const g = globalThis as unknown as { __flotaRepo?: FleetRepository };
export function getRepo(): FleetRepository { return (g.__flotaRepo ??= new DemoFleetRepository()); }

export async function fleetData(): Promise<FleetData> {
  const r = getRepo();
  const [trucks, fills, levels] = await Promise.all([r.trucks(), r.fills(), r.levels()]);
  return { trucks, fills, levels };
}
/** Alertele se calculează doar pe server. */
export async function alerts(): Promise<Alert[]> { return computeAlerts(await fleetData()); }
