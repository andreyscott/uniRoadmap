import { NextResponse } from "next/server";
import { getCourse } from "@/lib/content/load";
import { getCourseOfferings } from "@/lib/universities/queries";

/** GET /api/courses/<id>/universities: universities with their own version of this course. */
export async function GET(_request: Request, { params }: RouteContext<"/api/courses/[id]/universities">) {
  const { id } = await params;
  if (!getCourse(id)) return NextResponse.json({ error: "Unknown course." }, { status: 404 });
  try {
    return NextResponse.json(await getCourseOfferings(id));
  } catch (err) {
    console.error("[universities] offerings failed:", err);
    return NextResponse.json({ error: "Universities couldn't be loaded." }, { status: 503 });
  }
}
