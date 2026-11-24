import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/admin/access";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/supabase/server";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export interface MeResponse {
  /** True for admins and for editors of at least one university. */
  canEdit: boolean;
  university: { id: string; name: string; shortName: string } | null;
}

/** GET /api/me: what the signed-in user's account adds to the UI (admin link, "My university"). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return json({ error: "Not signed in." }, 401);
  try {
    const [staff, row] = await Promise.all([
      getStaffContext(),
      getDb().user.findUnique({
        where: { id: user.id },
        select: { university: { select: { id: true, name: true, shortName: true } } },
      }),
    ]);
    const body: MeResponse = { canEdit: staff !== null, university: row?.university ?? null };
    return json(body);
  } catch (err) {
    console.error("[me] load failed:", err);
    return json({ error: "Your account details couldn't be loaded." }, 503);
  }
}
