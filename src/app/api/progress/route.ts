import { NextResponse, type NextRequest } from "next/server";
import { roadmapExists } from "@/lib/content/load";
import { getDb } from "@/lib/db";
import { getModuleProgress, getRoadmapProgress, isRoadmapSaved } from "@/lib/progress/db";
import { getSessionUser } from "@/lib/supabase/server";

/** Per-user data, sometimes with refreshed auth cookies: never cache it anywhere. */
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

/**
 * The signed-in user's progress, read from the browser so roadmap pages can stay prerendered:
 * - GET /api/progress?roadmap=<id>: a general or skill roadmap, plus whether it's saved.
 * - GET /api/progress?universityCourse=<id>: a university's curriculum (modules).
 * Responds with { progress: { [id]: "done" | "in-progress" | "skipped" }, saved }.
 */
export async function GET(request: NextRequest) {
  const roadmapId = request.nextUrl.searchParams.get("roadmap");
  const universityCourseId = request.nextUrl.searchParams.get("universityCourse");
  if (roadmapId ? !roadmapExists(roadmapId) : !universityCourseId) {
    return json({ error: "Unknown roadmap." }, 400);
  }

  const user = await getSessionUser();
  if (!user) return json({ error: "Sign in to see your progress." }, 401);

  try {
    if (roadmapId) {
      const [progress, saved] = await Promise.all([getRoadmapProgress(user, roadmapId), isRoadmapSaved(user, roadmapId)]);
      return json({ progress, saved });
    }
    const exists = await getDb().universityCourse.findUnique({ where: { id: universityCourseId! }, select: { id: true } });
    if (!exists) return json({ error: "Unknown roadmap." }, 400);
    return json({ progress: await getModuleProgress(user, universityCourseId!), saved: false });
  } catch (err) {
    console.error("[progress] load failed:", err);
    return json({ error: "Your progress couldn't be loaded right now." }, 503);
  }
}
