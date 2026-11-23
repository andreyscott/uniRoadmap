"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { QuizQuestion } from "@/lib/content/schemas";
import { answersToQuery, type Answers } from "@/lib/quiz/scoring";
import { cn } from "@/lib/utils";
import { QuizProgress } from "./quiz-progress";

/**
 * Runs the course finder one question at a time. Answers stay in memory until the last
 * question, then go to the results page in its URL (so results can be bookmarked or shared).
 */
export function QuizRunner({ questions }: { questions: QuizQuestion[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const movedByUser = useRef(false);
  const helpId = useId();

  const question = questions[step];
  const chosen = answers[question.id] ?? [];
  const isLast = step === questions.length - 1;
  const max = question.kind === "single" ? 1 : (question.max ?? question.options.length);
  const atMax = question.kind === "multi" && chosen.length >= max;

  // After Next or Back, move focus to the new question so screen readers announce it.
  useEffect(() => {
    if (movedByUser.current) headingRef.current?.focus();
  }, [step]);

  const goTo = (next: number) => {
    movedByUser.current = true;
    setStep(next);
  };

  const toggle = (optionId: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = prev[question.id] ?? [];
      const next =
        question.kind === "single"
          ? [optionId]
          : checked
            ? [...current, optionId].slice(0, max)
            : current.filter((id) => id !== optionId);
      return { ...prev, [question.id]: next };
    });
  };

  return (
    <form
      className="mt-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (chosen.length === 0) return;
        if (isLast) router.push(`/quiz/results?${answersToQuery(answers)}`);
        else goTo(step + 1);
      }}
    >
      <QuizProgress total={questions.length} current={step} />

      <fieldset key={question.id} className="mt-8" aria-describedby={question.help ? helpId : undefined}>
        <legend className="w-full">
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none sm:text-3xl">
            {question.prompt}
          </h2>
        </legend>
        {question.help && (
          <p id={helpId} className="mt-2 text-muted-foreground">
            {question.help}
          </p>
        )}

        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {question.options.map((option) => {
            const checked = chosen.includes(option.id);
            return (
              <label
                key={option.id}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors",
                  "hover:border-primary/60 has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground",
                  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                  "has-disabled:cursor-not-allowed has-disabled:opacity-55 has-disabled:hover:border-border",
                )}
              >
                <input
                  type={question.kind === "single" ? "radio" : "checkbox"}
                  name={question.id}
                  value={option.id}
                  checked={checked}
                  disabled={!checked && atMax}
                  onChange={(e) => toggle(option.id, e.target.checked)}
                  className="size-4 shrink-0 accent-primary focus-visible:outline-none"
                />
                <span className="leading-snug">{option.label}</span>
              </label>
            );
          })}
        </div>

        {question.kind === "multi" && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            {chosen.length} of {max} chosen
          </p>
        )}
      </fieldset>

      <div className="mt-8 flex items-center gap-3">
        {step > 0 && (
          <Button type="button" variant="outline" className="h-11 px-5 text-base" onClick={() => goTo(step - 1)}>
            Back
          </Button>
        )}
        <Button type="submit" className="h-11 px-6 text-base" disabled={chosen.length === 0}>
          {isLast ? "See my matches" : "Next"}
        </Button>
      </div>
    </form>
  );
}
