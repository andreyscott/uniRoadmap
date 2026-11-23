"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckIcon, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EXAMS, type ExamId } from "@/lib/content/constants";
import type { QuizQuestion } from "@/lib/content/schemas";
import {
  answersFromParams,
  buildProfile,
  isComplete,
  matchLabel,
  rankCourses,
  type Match,
  type QuizCourse,
} from "@/lib/quiz/scoring";

interface QuizResultsProps {
  questions: QuizQuestion[];
  courses: QuizCourse[];
}

/** Scores the answers in the URL and shows the top three courses, then three more. */
export function QuizResults({ questions, courses }: QuizResultsProps) {
  const params = useSearchParams();
  const answers = useMemo(() => answersFromParams(questions, params), [questions, params]);
  const complete = isComplete(questions, answers);
  const { profile, ranked } = useMemo(() => {
    const profile = buildProfile(questions, answers);
    return { profile, ranked: rankCourses(courses, profile) };
  }, [questions, answers, courses]);

  if (!complete) {
    return (
      <div className="mt-8 rounded-xl border border-dashed p-6 sm:p-8">
        <p className="font-heading text-lg font-bold">Your answers are missing</p>
        <p className="mt-2 max-w-prose text-muted-foreground">
          This page shows course matches from the course finder, but the link doesn&apos;t include a full set of
          answers. It only takes a couple of minutes.
        </p>
        <Button asChild className="mt-5 h-11 px-5 text-base">
          <Link href="/quiz">Take the course finder</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Based on your answers, these courses fit you best. Each one explains why, and what to weigh up before you
        decide.
      </p>
      <ol className="mt-8 grid gap-6">
        {ranked.slice(0, 3).map((match, i) => (
          <MatchCard key={match.course.id} rank={i + 1} match={match} exam={profile.exam} />
        ))}
      </ol>

      <section aria-labelledby="more-heading" className="mt-14">
        <h2 id="more-heading" className="text-2xl font-bold tracking-tight">
          Also worth a look
        </h2>
        <ul className="mt-4 grid gap-1">
          {ranked.slice(3, 6).map((match) => (
            <li
              key={match.course.id}
              style={{ "--line": `var(--line-${match.course.faculty.color})` } as CSSProperties}
              className="group relative -mx-3 rounded-xl px-3 py-4 hover:bg-muted/70 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring"
            >
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span aria-hidden className="h-2.5 w-6 shrink-0 rounded-full bg-(--line)" />
                <Link
                  href={`/courses/${match.course.id}`}
                  className="font-heading text-lg font-bold underline-offset-4 group-hover:underline after:absolute after:inset-0 focus-visible:outline-none"
                >
                  {match.course.name}
                </Link>
                <span className="text-sm text-muted-foreground">{matchLabel(match.score)}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{match.course.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <ResultActions />
    </>
  );
}

function MatchCard({ rank, match, exam }: { rank: number; match: Match; exam: ExamId | null }) {
  const { course, reasons, cautions, score } = match;
  const entry = exam ? course.entry[exam] : undefined;

  return (
    <li style={{ "--line": `var(--line-${course.faculty.color})` } as CSSProperties}>
      <article aria-labelledby={`match-${course.id}`} className="rounded-2xl border bg-card p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-full border-4 border-(--line) bg-background font-heading text-lg font-extrabold"
          >
            {rank}
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{matchLabel(score)}</span>
              <span>{course.faculty.name}</span>
            </p>
            <h2 id={`match-${course.id}`} className="mt-1 text-2xl font-bold tracking-tight">
              <span className="sr-only">Match {rank}: </span>
              {course.name}
            </h2>
            <p className="mt-2 max-w-prose text-muted-foreground">{course.summary}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-heading text-sm font-bold">Why it fits you</h3>
            <ul className="mt-2 space-y-2">
              {reasons.map((reason) => (
                <li key={reason} className="flex gap-2.5">
                  <CheckIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-status-done" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
          {cautions.length > 0 && (
            <div>
              <h3 className="font-heading text-sm font-bold">Worth knowing</h3>
              <ul className="mt-2 space-y-2">
                {cautions.map((caution) => (
                  <li key={caution} className="flex gap-2.5">
                    <InfoIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                    {caution}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <dl className="mt-6 grid gap-4 border-t pt-5 text-sm md:grid-cols-2">
          {exam && entry && (
            <div>
              <dt className="font-heading font-bold">{EXAMS[exam].label} subjects</dt>
              {/* Subjects can contain commas ("One of: Chemistry, Biology"), so join with semicolons. */}
              <dd className="mt-1 text-muted-foreground">{entry.join("; ")}</dd>
            </div>
          )}
          <div>
            <dt className="font-heading font-bold">Careers</dt>
            <dd className="mt-1 text-muted-foreground">{course.careers.slice(0, 4).join(", ")}</dd>
          </div>
        </dl>

        <Button asChild className="mt-6 h-11 px-5 text-base">
          <Link href={`/courses/${course.id}`}>
            {course.hasRoadmap ? "See the roadmap" : "Read about this course"}
          </Link>
        </Button>
      </article>
    </li>
  );
}

function ResultActions() {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <div className="mt-12 flex flex-wrap items-center gap-3 border-t pt-8">
      <Button asChild variant="outline" className="h-11 px-5 text-base">
        <Link href="/quiz">Retake the course finder</Link>
      </Button>
      <Button type="button" variant="outline" className="h-11 px-5 text-base" onClick={copyLink}>
        Copy link to these results
      </Button>
      <Link href="/courses" className="rounded-sm px-2 text-primary underline underline-offset-4 hover:no-underline">
        Browse all courses
      </Link>
      <p role="status" className="w-full text-sm text-muted-foreground">
        {copied === "copied" && "Link copied. Anyone with it sees these same results."}
        {copied === "failed" && "Couldn't copy automatically. Copy the address from your browser's address bar instead."}
      </p>
    </div>
  );
}
