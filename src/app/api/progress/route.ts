import { NextResponse, type NextRequest } from "next/server";
import { roadmapExists } from "@/lib/content/load";
import { getRoadmapProgress } from "@/lib/progress/db";
import { getSessionUser } from "@/lib/supabase/server";

/** Per-user data, sometimes with refreshed auth cookies: never cache it anywhere. */
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

/**
 * GET /api/progress?roadmap=<id>: the signed-in user's progress on one roadmap, as
 * { progress: { [nodeId]: "done" | "in-progress" | "skipped" } }.
 * Read from the browser so roadmap pages can stay prerendered.
 */
export async function GET(request: NextRequest) {
  const roadmapId = request.nextUrl.searchParams.get("roadmap");
  if (!roadmapId || !roadmapExists(roadmapId)) return json({ error: "Unknown roadmap." }, 400);

  const user = await getSessionUser();
  if (!user) return json({ error: "Sign in to see your progress." }, 401);

  try {
    return json({ progress: await getRoadmapProgress(user, roadmapId) });
  } catch (err) {
    console.error("[progress] load failed:", err);
    return json({ error: "Your progress couldn't be loaded right now." }, 503);
  }
}
