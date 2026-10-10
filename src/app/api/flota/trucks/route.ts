import { NextResponse } from "next/server";
import { getRepo } from "@/lib/flota/repo";
export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ demo: true, trucks: await getRepo().trucks() });
}
