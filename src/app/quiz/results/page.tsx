import { Suspense } from "react";
import type { Metadata } from "next";
import { QuizResults } from "@/components/quiz/quiz-results";
import { getCourses, getFaculty, getQuiz } from "@/lib/content/load";
import { toQuizCourse } from "@/lib/quiz/scoring";

// The answers are in the URL and scored in the browser, so this page itself stays static.
export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "Your course matches",
  description: "Your top university course matches from the Uniroadmap course finder.",
  // Every answer combination is a different URL; none of them belong in search results.
  robots: { index: false, follow: true },
};

export default function QuizResultsPage() {
  const { questions } = getQuiz();
  // The loader has already checked that every course's faculty exists.
  const courses = getCourses().map((course) => toQuizCourse(course, getFaculty(course.faculty)!));

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Your course matches</h1>
      <Suspense fallback={<ResultsSkeleton />}>
        <QuizResults questions={questions} courses={courses} />
      </Suspense>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div aria-busy="true" className="mt-8">
      <span className="sr-only">Working out your matches</span>
      <div aria-hidden className="grid animate-pulse gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-72 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
