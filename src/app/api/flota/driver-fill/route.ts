import { NextResponse } from "next/server";
import { getRepo } from "@/lib/flota/repo";
export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const plate = new URL(req.url).searchParams.get("plate") ?? undefined;
  return NextResponse.json({ demo: true, fills: await getRepo().driverFills(plate) });
}

/** Alimentare raportată de șofer: litri + km (obligatorii), poză bon opțională (în demo păstrăm doar numele și mărimea). */
export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "form" }, { status: 400 }); }
  const litres = Number(form.get("litres")), km = Number(form.get("km"));
  if (!(litres > 0 && litres <= 2000) || !(km > 0 && km < 5_000_000)) return NextResponse.json({ error: "litres/km" }, { status: 400 });
  const photo = form.get("photo");
  const meta = photo instanceof File && photo.size > 0 ? { name: photo.name.slice(0, 80), type: photo.type, size: photo.size } : null;
  if (meta && meta.size > 8 * 1024 * 1024) return NextResponse.json({ error: "photo too large" }, { status: 413 });
  const f = await getRepo().addDriverFill({ driver: String(form.get("driver") ?? "").slice(0, 40), plate: String(form.get("plate") ?? "").slice(0, 15), station: String(form.get("station") ?? "").slice(0, 60), litres, km, photo: meta });
  return NextResponse.json({ ok: true, fill: f });
}
