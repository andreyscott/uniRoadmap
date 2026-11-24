"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile } from "@/components/auth/auth-provider";

interface Offering {
  id: string;
  name: string;
  shortName: string;
  hasCurriculum: boolean;
}

/**
 * "University versions" on a general course page. Loaded in the browser so the course page
 * stays prerendered while university data changes at runtime. Puts the student's own
 * university first when it offers this course.
 */
export function CourseUniversities({ courseId, courseName }: { courseId: string; courseName: string }) {
  const [offerings, setOfferings] = useState<Offering[] | null>(null);
  const { profile } = useProfile();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/courses/${encodeURIComponent(courseId)}/universities`)
      .then((res) => (res.ok ? (res.json() as Promise<Offering[]>) : []))
      .then((data) => !cancelled && setOfferings(data))
      .catch(() => !cancelled && setOfferings([]));
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (!offerings || offerings.length === 0) return null;
  const mine = offerings.find((o) => o.id === profile?.university?.id);
  const others = offerings.filter((o) => o !== mine);

  return (
    <div className="mt-6 max-w-3xl rounded-xl border bg-card p-4">
      {mine && (
        <p className="font-medium">
          Your university has its own version:{" "}
          <Link href={`/universities/${mine.id}/${courseId}`} className="text-primary underline underline-offset-4">
            {courseName} at {mine.shortName}
          </Link>
        </p>
      )}
      {others.length > 0 && (
        <p className={mine ? "mt-2 text-sm text-muted-foreground" : "text-sm"}>
          <span className={mine ? "" : "font-medium"}>{mine ? "Also at" : "University versions"}:</span>{" "}
          {others.map((o, i) => (
            <span key={o.id}>
              {i > 0 && ", "}
              <Link
                href={`/universities/${o.id}/${courseId}`}
                className="text-primary underline underline-offset-4"
                title={o.hasCurriculum ? o.name : `${o.name} (curriculum coming soon)`}
              >
                {o.shortName}
              </Link>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
