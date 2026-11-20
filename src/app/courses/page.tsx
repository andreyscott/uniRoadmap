import { Suspense } from "react";
import type { Metadata } from "next";
import { CourseDirectory } from "@/components/courses/course-directory";
import { DirectoryView } from "@/components/courses/directory-view";
import { JsonLd } from "@/components/json-ld";
import { EMPTY_FILTERS, directoryOptions, toListing } from "@/lib/content/directory";
import { getCourses, getFaculties, getFaculty } from "@/lib/content/load";
import { siteConfig } from "@/lib/site";

// Built from content files only. Filtering happens in the browser, so the page stays static.
export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Browse university courses by faculty, difficulty, career and the subjects you're taking, then follow each one year by year.",
  alternates: { canonical: "/courses" },
};

export default function CoursesPage() {
  // The loader has already checked that every course's faculty exists.
  const listings = getCourses()
    .map((course) => toListing(course, getFaculty(course.faculty)!))
    .sort((a, b) => a.name.localeCompare(b.name));
  const options = directoryOptions(listings, getFaculties());

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Courses",
          itemListElement: listings.map((listing, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: listing.name,
            url: `${siteConfig.url}/courses/${listing.id}`,
          })),
        }}
      />

      <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Courses</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Filter by faculty, difficulty, career or the subjects you&apos;re taking, then open a course to see
        what you&apos;ll learn each year.
      </p>

      {/* The prerendered HTML shows every course (good for search engines and slow connections);
          the interactive directory takes over once the browser knows the URL's filters. */}
      <Suspense fallback={<DirectoryView listings={listings} options={options} filters={EMPTY_FILTERS} />}>
        <CourseDirectory listings={listings} options={options} />
      </Suspense>
    </div>
  );
}
