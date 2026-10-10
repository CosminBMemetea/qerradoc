import { NextResponse } from "next/server";
import { alerts } from "@/lib/flota/repo";
export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";
export async function GET() {
  const list = await alerts();
  return NextResponse.json({ demo: true, count: list.length, alerts: list });
}
