import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard/db";
import { getSessionUser } from "@/lib/supabase/server";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

/** GET /api/dashboard: the signed-in user's roadmaps, recent activity and saved quiz results. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return json({ error: "Sign in to see your roadmaps." }, 401);

  try {
    return json(await getDashboardData(user));
  } catch (err) {
    console.error("[dashboard] load failed:", err);
    return json({ error: "Your dashboard couldn't be loaded right now." }, 503);
  }
}
