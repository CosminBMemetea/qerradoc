import { NextResponse } from "next/server";
import { getRepo } from "@/lib/flota/repo";
export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("truck") ?? undefined;
  const r = getRepo();
  const trucks = (await r.trucks()).filter((t) => !id || t.id === id).map((t) => ({ id: t.id, plate: t.plate, driver: t.driver, routeName: t.routeName, route: t.route.map((w) => w.at) }));
  return NextResponse.json({ demo: true, day: "2026-10-15", trucks, track: await r.track(id), driverPings: id ? [] : await r.driverPings() });
}

/** Pagina șoferului (/flota/sofer) trimite aici poziția cât e deschisă. */
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "JSON invalid" }, { status: 400 }); }
  const lat = Number(b.lat), lng = Number(b.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return NextResponse.json({ error: "coordonate invalide" }, { status: 400 });
  if (b.consent !== true) return NextResponse.json({ error: "lipsește acordul șoferului" }, { status: 403 });
  const ping = await getRepo().addDriverPing({ driver: String(b.driver ?? "Șofer demo").slice(0, 60), plate: String(b.plate ?? "").slice(0, 15), lat, lng, accuracyM: Math.round(Number(b.accuracy) || 0), demo: b.demo === true });
  return NextResponse.json({ ok: true, ping });
}
