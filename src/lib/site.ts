/** Site-wide constants used by the layout, metadata and sitemap. */
export const siteConfig = {
  name: "Uniroadmap",
  description:
    "Find the university course that fits you, then follow a clear year-by-year roadmap through it.",
  // Set NEXT_PUBLIC_SITE_URL in production so canonical URLs and OG images resolve correctly.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  nav: [
    { href: "/courses", label: "Courses" },
    { href: "/skills", label: "Skill roadmaps" },
    { href: "/quiz", label: "Course finder" },
  ],
} as const;

export type NavItem = (typeof siteConfig.nav)[number];
