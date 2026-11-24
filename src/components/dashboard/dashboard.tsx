"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { CheckIcon, ClockIcon, SkipForwardIcon } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import type { ActivityItem, DashboardRoadmap } from "@/lib/dashboard/build";
import type { DashboardData, SavedQuizResult } from "@/lib/dashboard/db";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

type Loaded = { key: string; data: DashboardData } | { key: string; error: string };

/** The signed-in user's dashboard, loaded in the browser so the page stays prerendered. */
export function Dashboard() {
  const auth = useAuth();
  const key = auth.status === "signed-in" ? auth.user.id : null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch("/api/dashboard", { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as DashboardData & { error?: string };
        if (!res.ok || !body.roadmaps) throw new Error(body.error ?? "Your dashboard couldn't be loaded.");
        return body;
      })
      .then((data) => !cancelled && setLoaded({ key, data }))
      .catch((err: Error) => !cancelled && setLoaded({ key, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (auth.status === "unavailable") {
    return (
      <Notice title="Sign-in isn't set up on this site yet">
        Everything else works without an account: browse the <InlineLink href="/courses">courses</InlineLink> or
        take the <InlineLink href="/quiz">course finder</InlineLink>.
      </Notice>
    );
  }

  if (auth.status === "signed-out") {
    return (
      <Notice
        title="Sign in to see your roadmaps"
        action={
          <Button asChild className="h-11 px-5 text-base">
            <Link href="/login?next=%2Fdashboard">Sign in</Link>
          </Button>
        }
      >
        Your dashboard shows the roadmaps you&apos;ve saved or started, how far you&apos;ve got, what to learn
        next, and your saved course finder results.
      </Notice>
    );
  }

  const current = loaded && loaded.key === key ? loaded : null;
  if (auth.status === "loading" || !current) return <DashboardSkeleton />;
  if ("error" in current) {
    return <Notice title="Your dashboard couldn't be loaded">{current.error} Try again in a moment.</Notice>;
  }

  const { roadmaps, activity, quizResults } = current.data;
  const email = auth.user.email;

  if (roadmaps.length === 0 && quizResults.length === 0) {
    return (
      <>
        {email && <SignedInAs email={email} />}
        <Notice
          title="You haven't started a roadmap yet"
          action={
            <div className="flex flex-wrap gap-3">
              <Button asChild className="h-11 px-5 text-base">
                <Link href="/courses">Browse courses</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 px-5 text-base">
                <Link href="/quiz">Take the course finder</Link>
              </Button>
            </div>
          }
        >
          Open any roadmap and mark a topic done, in progress or skipped, or save the roadmap. It will show up
          here so you can pick up where you left off. Not sure where to start? The course finder suggests
          courses that fit you, and the <InlineLink href="/skills">skill roadmaps</InlineLink> help with any
          degree.
        </Notice>
      </>
    );
  }

  // Suggest the most recently active roadmap that still has something to do.
  const continueWith = roadmaps.find((r) => r.next);

  return (
    <>
      {email && <SignedInAs email={email} />}

      {continueWith?.next && <ContinueCard roadmap={continueWith} next={continueWith.next} />}

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="roadmaps-heading">
          <h2 id="roadmaps-heading" className="text-2xl font-bold tracking-tight">
            Your roadmaps
          </h2>
          {roadmaps.length > 0 ? (
            <ul className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {roadmaps.map((roadmap) => (
                <RoadmapCard key={roadmap.id} roadmap={roadmap} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted-foreground">
              None yet. Open a <InlineLink href="/courses">course roadmap</InlineLink> and save it or mark a topic.
            </p>
          )}
        </section>

        <div className="grid content-start gap-12">
          <QuizResults results={quizResults} />
          {activity.length > 0 && <RecentActivity items={activity} />}
        </div>
      </div>
    </>
  );
}

function SignedInAs({ email }: { email: string }) {
  return (
    <p className="mt-2 text-muted-foreground">
      Signed in as <span className="font-medium text-foreground">{email}</span>
    </p>
  );
}

function ContinueCard({ roadmap, next }: { roadmap: DashboardRoadmap; next: NonNullable<DashboardRoadmap["next"]> }) {
  return (
    <section
      aria-labelledby="continue-heading"
      style={{ "--line": `var(--line-${roadmap.color})` } as CSSProperties}
      className="mt-8 rounded-2xl border-2 border-(--line) bg-card p-5 sm:p-7"
    >
      <h2 id="continue-heading" className="flex items-center gap-2.5 text-sm font-bold text-muted-foreground">
        <span aria-hidden className="h-2.5 w-6 rounded-full bg-(--line)" />
        Continue {roadmap.title}
      </h2>
      <p className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{next.title}</p>
      <p className="mt-1 text-muted-foreground">
        {next.status === "in-progress" ? "You started this topic." : "Your next topic."}{" "}
        {roadmap.summary.done} of {roadmap.summary.counted} topics done.
      </p>
      <Button asChild className="mt-5 h-11 px-5 text-base">
        <Link href={`${roadmap.href}#${next.id}`}>Open topic</Link>
      </Button>
    </section>
  );
}

function RoadmapCard({ roadmap }: { roadmap: DashboardRoadmap }) {
  const { summary } = roadmap;
  return (
    <li
      style={{ "--line": `var(--line-${roadmap.color})` } as CSSProperties}
      className="group relative rounded-xl border bg-card p-4 hover:border-(--line) has-[a.stretched:focus-visible]:outline-2 has-[a.stretched:focus-visible]:outline-offset-2 has-[a.stretched:focus-visible]:outline-ring sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2.5 text-lg font-bold">
          <span aria-hidden className="h-2.5 w-6 shrink-0 rounded-full bg-(--line)" />
          <Link
            href={roadmap.href}
            className="stretched underline-offset-4 group-hover:underline after:absolute after:inset-0 focus-visible:outline-none"
          >
            {roadmap.title}
          </Link>
        </h3>
        <span className="shrink-0 pt-1 text-xs text-muted-foreground">
          {roadmap.kind === "course" ? "Degree" : roadmap.kind === "university" ? "University" : "Skill"}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={`${roadmap.title} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={summary.percent}
        className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-status-done" style={{ width: `${summary.percent}%` }} />
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">
            {summary.done} of {summary.counted}
          </span>{" "}
          done
        </span>
        {summary.inProgress > 0 && <span>{summary.inProgress} in progress</span>}
        <span>Active {formatRelative(roadmap.lastActive)}</span>
      </p>
      {roadmap.next ? (
        <p className="mt-3 text-sm">
          <span className="text-muted-foreground">{roadmap.next.status === "in-progress" ? "Working on" : "Next"}:</span>{" "}
          {/* Sits above the card's stretched link so it stays clickable on its own. */}
          <Link
            href={`${roadmap.href}#${roadmap.next.id}`}
            className="relative z-10 rounded-sm font-medium text-primary underline underline-offset-4 hover:no-underline"
          >
            {roadmap.next.title}
          </Link>
        </p>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-status-done">
          <CheckIcon aria-hidden className="size-4" /> Every topic done or skipped
        </p>
      )}
    </li>
  );
}

const ACTIVITY_VERB = { done: "Finished", "in-progress": "Started", skipped: "Skipped" } as const;
const ACTIVITY_ICON = { done: CheckIcon, "in-progress": ClockIcon, skipped: SkipForwardIcon } as const;

function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="text-xl font-bold tracking-tight">
        Recent activity
      </h2>
      <ol className="mt-4 grid gap-3">
        {items.map((item) => {
          const Icon = ACTIVITY_ICON[item.status];
          return (
            <li key={`${item.nodeId}-${item.updatedAt}`} className="flex gap-3">
              <Icon
                aria-hidden
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  item.status === "done" && "text-status-done",
                  item.status === "in-progress" && "text-status-progress",
                  item.status === "skipped" && "text-muted-foreground",
                )}
              />
              <div className="min-w-0 text-sm">
                <p>
                  {ACTIVITY_VERB[item.status]}{" "}
                  <Link href={item.href} className="font-medium underline-offset-4 hover:underline">
                    {item.title}
                  </Link>
                </p>
                <p className="text-muted-foreground">
                  {item.roadmapTitle}, {formatRelative(item.updatedAt)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function QuizResults({ results }: { results: SavedQuizResult[] }) {
  const [latest, ...earlier] = results;
  return (
    <section aria-labelledby="quiz-heading">
      <h2 id="quiz-heading" className="text-xl font-bold tracking-tight">
        Course finder
      </h2>
      {latest ? (
        <div className="mt-4 rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Your top matches, saved {formatRelative(latest.createdAt)}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 font-medium">
            {latest.courses.map((course) => (
              <li key={course.id}>
                <Link href={course.href} className="underline-offset-4 hover:underline">
                  {course.name}
                </Link>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <InlineLink href={latest.href}>See full results</InlineLink>
            <InlineLink href="/quiz">Retake</InlineLink>
          </div>
          {earlier.length > 0 && (
            <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
              Earlier:{" "}
              {earlier.map((result, i) => (
                <span key={result.id}>
                  {i > 0 && ", "}
                  <InlineLink href={result.href}>{formatRelative(result.createdAt)}</InlineLink>
                </span>
              ))}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Answer a few questions and save the results to keep them here.{" "}
          <InlineLink href="/quiz">Take the course finder</InlineLink>
        </p>
      )}
    </section>
  );
}

function Notice({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-8 max-w-2xl rounded-xl border border-dashed p-6 sm:p-8">
      <h2 className="font-heading text-xl font-bold">{title}</h2>
      <p className="mt-2 text-muted-foreground">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded-sm font-medium text-primary underline underline-offset-4 hover:no-underline">
      {children}
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" className="mt-8">
      <span className="sr-only">Loading your roadmaps</span>
      <div aria-hidden className="animate-pulse">
        <div className="h-44 rounded-2xl bg-muted" />
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
