import { NextRequest, NextResponse } from "next/server";
import { rankProviders } from "@/lib/reco";
import type { ProviderDoc } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const providers = (body?.providers || []) as ProviderDoc[];
    const city = body?.city as any;
    const service = body?.service as string | undefined;
    // avoid caching for dynamic recommendations
    const items = rankProviders(providers, { city, service });
    return NextResponse.json({ items }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to compute recommendations" }, { status: 500 });
  }
}
