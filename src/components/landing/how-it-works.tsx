import Link from "next/link";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Find your course",
    body: "Search the course directory, or answer a few questions in the course finder and get three suggestions with the reasons they fit you.",
  },
  {
    title: "Follow the roadmap",
    body: "Each year lists its core modules, electives and optional skills. Open any topic to see its key concepts and free resources.",
  },
  {
    title: "Track your progress",
    body: "Sign in to mark topics done, in progress or skipped, and see how far through each year you are.",
  },
] as const;

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="border-y bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 id="how-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
          How it works
        </h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4 md:block">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-primary font-heading font-bold text-primary"
              >
                {i + 1}
              </span>
              <div className="md:mt-4">
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="mt-1.5 max-w-prose text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Button asChild className="mt-10 h-11 px-5 text-base">
          <Link href="/quiz">Take the course finder</Link>
        </Button>
      </div>
    </section>
  );
}
