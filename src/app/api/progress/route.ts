import { NextResponse, type NextRequest } from "next/server";
import { roadmapExists } from "@/lib/content/load";
import { getRoadmapProgress, isRoadmapSaved } from "@/lib/progress/db";
import { getSessionUser } from "@/lib/supabase/server";

/** Per-user data, sometimes with refreshed auth cookies: never cache it anywhere. */
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

/**
 * GET /api/progress?roadmap=<id>: the signed-in user's progress on one roadmap, and whether
 * they've saved it, as { progress: { [nodeId]: "done" | "in-progress" | "skipped" }, saved }.
 * Read from the browser so roadmap pages can stay prerendered.
 */
export async function GET(request: NextRequest) {
  const roadmapId = request.nextUrl.searchParams.get("roadmap");
  if (!roadmapId || !roadmapExists(roadmapId)) return json({ error: "Unknown roadmap." }, 400);

  const user = await getSessionUser();
  if (!user) return json({ error: "Sign in to see your progress." }, 401);

  try {
    const [progress, saved] = await Promise.all([getRoadmapProgress(user, roadmapId), isRoadmapSaved(user, roadmapId)]);
    return json({ progress, saved });
  } catch (err) {
    console.error("[progress] load failed:", err);
    return json({ error: "Your progress couldn't be loaded right now." }, 503);
  }
}
