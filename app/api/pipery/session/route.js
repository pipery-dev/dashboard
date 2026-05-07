import { NextResponse } from "next/server";
import { getPiperySession } from "@/lib/provider-session";

export async function GET() {
  const session = await getPiperySession();

  return NextResponse.json(
    {
      authenticated: !!session,
      session
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    }
  );
}
