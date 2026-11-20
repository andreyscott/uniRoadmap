import type { Metadata } from "next";
import Link from "next/link";
import { CourseSearch } from "@/components/course-search";
import { JsonLd } from "@/components/json-ld";
import { FeaturedDegrees } from "@/components/landing/featured-degrees";
import { FeaturedSkills } from "@/components/landing/featured-skills";
import { HowItWorks } from "@/components/landing/how-it-works";
import { siteConfig } from "@/lib/site";

// Everything here comes from the content files, so the whole page must stay prerendered.
// The build fails if request-time work (cookies, uncached data) is ever added to it.
export const ensureStatic = "navigation";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteConfig.name,
          url: siteConfig.url,
          description: siteConfig.description,
        }}
      />

      <section className="mx-auto max-w-6xl px-4 pt-12 pb-4 sm:px-6 sm:pt-20">
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
          Pick the right course. Then know what to learn, year by year.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Uniroadmap maps each degree from first year to final year: the core modules, electives and
          skills, with free resources for every topic.
        </p>
        <CourseSearch className="mt-8 max-w-xl" />
        <p className="mt-5 max-w-xl text-muted-foreground">
          Not sure what to study?{" "}
          <Link href="/quiz" className="font-medium text-primary underline underline-offset-4">
            Take the course finder
          </Link>{" "}
          and get three suggestions based on your subjects, interests and goals.
        </p>
      </section>

      <FeaturedDegrees />
      <HowItWorks />
      <FeaturedSkills />
    </>
  );
}
