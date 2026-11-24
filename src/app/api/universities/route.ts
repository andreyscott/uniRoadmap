import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getUniversityList } from "@/lib/universities/queries";

/**
 * GET /api/universities: every university and the courses it has versions of. Public, read
 * from cache (admin edits expire it); used by the course directory's university filter.
 */
export async function GET() {
  await connection();
  try {
    return NextResponse.json(await getUniversityList());
  } catch (err) {
    console.error("[universities] list failed:", err);
    return NextResponse.json({ error: "Universities couldn't be loaded." }, { status: 503 });
  }
}
