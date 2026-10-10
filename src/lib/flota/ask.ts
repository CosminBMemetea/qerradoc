// Asistentul patronului. Modelul (Groq) doar ALEGE o funcție și argumentele ei; nu primește
// datele flotei și nu scrie cifre. Răspunsul se construiește aici, din rezultatul funcției.
import { DEMO_DAY } from "./data";
import { fmtDate, fmtMoney, fmtNum, fmtPct, t, type Locale } from "./i18n";
import { alertsInRange, costPerKm, fillsBy, findTruck, fleetTotals, movingNow, PERIOD_START, topConsumers, truckSummary, type Period } from "./query";
import { ruleTitle, type FleetData } from "./rules";

export type ToolName = "top_consumers" | "truck_summary" | "alerts" | "cost_per_km" | "fills" | "fleet_totals" | "moving_now";
export interface ToolCall { tool: ToolName; args: { period?: Period; plate?: string; station?: string; only_theft?: boolean } }
export interface Answer { text: string; links: { href: string; label: string }[]; source: "ai" | "rules"; tool: ToolName | null; notice?: "fallback" }

const PERIODS: Period[] = ["month", "30d", "week", "yesterday"];
export const TOOLS = [
  { name: "top_consumers", description: "Trucks ranked by fuel consumption (L/100km) vs their normal, for a period.", parameters: { type: "object", properties: { period: { type: "string", enum: PERIODS } } } },
  { name: "truck_summary", description: "Status, location, 30-day consumption, fill-ups and alerts of one truck, by licence plate.", parameters: { type: "object", properties: { plate: { type: "string" } }, required: ["plate"] } },
  { name: "alerts", description: "Fuel alerts (theft suspicions, consumption warnings) in a period, optionally only theft.", parameters: { type: "object", properties: { period: { type: "string", enum: PERIODS }, only_theft: { type: "boolean" } } } },
  { name: "cost_per_km", description: "Fuel cost per km for one truck (plate) or the whole fleet (no plate), last 30 days.", parameters: { type: "object", properties: { plate: { type: "string" } } } },
  { name: "fills", description: "Recent fuel fill-ups, filtered by truck plate and/or station/city name.", parameters: { type: "object", properties: { plate: { type: "string" }, station: { type: "string" } } } },
  { name: "fleet_totals", description: "Total litres, cost and average consumption of the fleet for a period.", parameters: { type: "object", properties: { period: { type: "string", enum: PERIODS } } } },
  { name: "moving_now", description: "Which trucks are moving right now.", parameters: { type: "object", properties: {} } },
] as const;

const PLATE_RE = /\b([A-Z]{1,2})[\s-]?(\d{2,3})[\s-]?([A-Z]{3})\b/i;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");

export function detectLocale(q: string, fallback: Locale): Locale {
  if (/[ąęłńśźż]|\b(kto|jakie|ile|gdzie|ktora|ktore|ciezarow|w tym)\b/i.test(q)) return "pl";
  if (/[ăâîșşțţ]|\b(cine|cat|care|unde|luna|asta|camion|consumat)\b/i.test(q)) return "ro";
  if (/\b(who|what|which|how|where|the|this)\b/i.test(q)) return "en";
  return fallback;
}
function periodOf(n: string, def: Period): Period {
  if (/saptaman|week|tydz|tygod/.test(n)) return "week";
  if (/\bieri\b|yesterday|wczoraj/.test(n)) return "yesterday";
  if (/30 de zile|30 days|30 dni/.test(n)) return "30d";
  if (/luna|month|miesia/.test(n)) return "month";
  return def;
}
/** Răspuns fără AI: ~8 întrebări uzuale, în ro/en/pl. */
export function ruleIntent(q: string): ToolCall | null {
  const n = norm(q);
  const plate = q.match(PLATE_RE)?.slice(1).join(" ").toUpperCase();
  if (/furt|theft|steal|kradz|alert|suspect|podejrz/.test(n)) return { tool: "alerts", args: { period: periodOf(n, "week"), only_theft: /furt|theft|steal|kradz/.test(n) } };
  if (/pe km|per km|za km|\/km|cost per|koszt.*km|cost.*km/.test(n)) return { tool: "cost_per_km", args: { plate } };
  if (/aliment|refuel|fill|tankow|statie|station|stacj/.test(n)) return { tool: "fills", args: { plate, station: n.match(/(?:la|at|na)\s+(omv|mol|petrom|rompetrol|lukoil|shell)/)?.[1] } };
  if (/in mers|moving|w trasie|jedzie|unde sunt|where are|gdzie sa|on the road/.test(n)) return { tool: "moving_now", args: {} };
  if (/cel mai mult|cel mai mare|most|najwiecej|najwyz|top|clasament|ranking|worst/.test(n)) return { tool: "top_consumers", args: { period: periodOf(n, "month") } };
  if (/cost|cat am|how much|ile|total|litri|litres|litr|cheltu|spent|wydal|motorin|diesel|paliw|olej/.test(n)) return { tool: "fleet_totals", args: { period: periodOf(n, "month") } };
  if (plate) return { tool: "truck_summary", args: { plate } };
  if (/consum|fuel|spala|spalil/.test(n)) return { tool: "top_consumers", args: { period: periodOf(n, "month") } };
  return null;
}

const join = (xs: string[]) => xs.join("; ");
export function render(loc: Locale, d: FleetData, call: ToolCall | null, source: Answer["source"]): Answer {
  const links: Answer["links"] = [];
  const link = (truckId: string, plate: string) => { if (!links.some((l) => l.label === plate)) links.push({ href: `/flota/camion/${truckId}`, label: plate }); };
  const base = { source, tool: call?.tool ?? null } as const;
  if (!call) return { ...base, text: t(loc, "ask.unknown"), links };
  const a = call.args;
  const period: Period = a.period && PERIODS.includes(a.period) ? a.period : "month";
  switch (call.tool) {
    case "top_consumers": {
      const rows = topConsumers(d, period, 3);
      rows.forEach((r) => link(r.truckId, r.plate));
      return { ...base, links, text: t(loc, "ans.top", { period: t(loc, `period.${period}`), list: join(rows.map((r) => t(loc, "ans.topItem", { plate: r.plate, l100: fmtNum(loc, r.l100, 1), pct: fmtPct(loc, r.overNormal) }))) }) };
    }
    case "truck_summary": {
      const s = truckSummary(d, a.plate ?? "");
      if (!s) return { ...base, text: t(loc, "ask.unknown"), links };
      link(s.truckId, s.plate);
      return { ...base, links, text: t(loc, "ans.truck", { plate: s.plate, model: s.model, driver: s.driver, status: t(loc, `status.${s.status}`), place: s.place, avg: fmtNum(loc, s.avgL100, 1), normal: fmtNum(loc, s.normal, 1), fills: s.fills, litres: fmtNum(loc, s.litres), alerts: s.alerts }) };
    }
    case "alerts": {
      const from = PERIOD_START[period];
      const list = alertsInRange(d, from, "2026-10-16", !!a.only_theft);
      const vars = { from: fmtDate(loc, from), to: fmtDate(loc, DEMO_DAY), n: list.length };
      if (!list.length) return { ...base, links, text: t(loc, "ans.alertsNone", vars) };
      list.forEach((x) => link(x.truckId, d.trucks.find((tr) => tr.id === x.truckId)!.plate));
      return { ...base, links, text: t(loc, "ans.alerts", { ...vars, list: join(list.slice(0, 5).map((x) => t(loc, "ans.alertItem", { rule: ruleTitle(loc, x.rule), plate: d.trucks.find((tr) => tr.id === x.truckId)!.plate, time: fmtDate(loc, x.time) }))) }) };
    }
    case "cost_per_km": {
      const tr = a.plate ? findTruck(d, a.plate) : undefined;
      if (a.plate && !tr) return { ...base, text: t(loc, "ask.unknown"), links };
      const rows = costPerKm(d, tr?.plate);
      if (tr) { const r = rows[0]; link(r.truckId, r.plate); return { ...base, links, text: t(loc, "ans.cost", { plate: r.plate, cost: fmtMoney(loc, r.cost), km: fmtNum(loc, r.km), perKm: fmtMoney(loc, r.perKm, 2) }) }; }
      const cost = rows.reduce((s, r) => s + r.cost, 0), km = rows.reduce((s, r) => s + r.km, 0);
      link(rows[0].truckId, rows[0].plate);
      return { ...base, links, text: t(loc, "ans.costFleet", { cost: fmtMoney(loc, cost), km: fmtNum(loc, km), perKm: fmtMoney(loc, cost / km, 2), worst: `${rows[0].plate} (${fmtMoney(loc, rows[0].perKm, 2)}/km)` }) };
    }
    case "fills": {
      const rows = fillsBy(d, a.plate, a.station, 5);
      rows.forEach((r) => link(r.truckId, r.plate));
      const filter = [a.plate, a.station].filter(Boolean).join(", ");
      return { ...base, links, text: t(loc, "ans.fills", { n: rows.length, filter: filter ? ` (${filter})` : "", list: join(rows.map((r) => t(loc, "ans.fillItem", { time: fmtDate(loc, r.time), plate: r.plate, station: r.station, litres: fmtNum(loc, r.litres) }))) }) };
    }
    case "fleet_totals": {
      const s = fleetTotals(d, period);
      const pl = t(loc, `period.${period}`);
      return { ...base, links, text: t(loc, "ans.totals", { period: pl.charAt(0).toUpperCase() + pl.slice(1), litres: fmtNum(loc, s.litres), cost: fmtMoney(loc, s.cost), avg: fmtNum(loc, s.avgL100, 1) }) };
    }
    case "moving_now": {
      const rows = movingNow(d);
      rows.forEach((r) => link(r.truckId, r.plate));
      return { ...base, links, text: t(loc, "ans.moving", { n: rows.length, total: d.trucks.length, list: rows.map((r) => `${r.plate} (${r.place})`).join(", ") }) };
    }
  }
}

export function parseToolCall(name: string, rawArgs: string): ToolCall | null {
  if (!TOOLS.some((x) => x.name === name)) return null;
  let args: ToolCall["args"] = {};
  try { args = JSON.parse(rawArgs || "{}"); } catch { return null; }
  const clean: ToolCall["args"] = {};
  if (typeof args.period === "string" && PERIODS.includes(args.period as Period)) clean.period = args.period as Period;
  if (typeof args.plate === "string" && args.plate.length <= 15) clean.plate = args.plate;
  if (typeof args.station === "string" && args.station.length <= 40) clean.station = args.station;
  if (typeof args.only_theft === "boolean") clean.only_theft = args.only_theft;
  return { tool: name as ToolName, args: clean };
}
