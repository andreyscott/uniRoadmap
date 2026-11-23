import type { Metadata } from "next";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { getQuiz } from "@/lib/content/load";

export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "Course finder",
  description:
    "Answer a few quick questions about what you enjoy and what you want from a career, and get three university courses that fit you, with the reasons why.",
  alternates: { canonical: "/quiz" },
};

export default function QuizPage() {
  const { questions } = getQuiz();

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Course finder</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Answer {questions.length} quick questions about what you enjoy and what you want from a career. We&apos;ll
        suggest three courses and explain why each one fits. No sign-in needed.
      </p>
      <QuizRunner questions={questions} />
    </div>
  );
}
