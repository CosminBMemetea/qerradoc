import { NextResponse } from "next/server";
import { fleetData } from "@/lib/flota/repo";
import { avgL100, intervals } from "@/lib/flota/rules";
export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("truck");
  const d = await fleetData();
  const trucks = d.trucks.filter((t) => !id || t.id === id);
  return NextResponse.json({ demo: true, trucks: trucks.map((t) => ({ id: t.id, plate: t.plate, normalL100: t.normalL100, avgL100_30d: avgL100(d, t), fills: d.fills.filter((f) => f.truckId === t.id), intervals: intervals(d, t).map((i) => ({ from: i.from.id, to: i.to.id, km: i.km, litres: i.litres, l100: i.l100 })) })) });
}
