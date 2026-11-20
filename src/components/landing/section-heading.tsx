import type { ReactNode } from "react";
import Link from "next/link";

interface SectionHeadingProps {
  /** Used by the section's aria-labelledby. */
  id: string;
  title: string;
  href: string;
  linkLabel: string;
  /** Intro sentence under the heading. */
  children: ReactNode;
}

/** Section title with a "see all" link on the right and a short intro. */
export function SectionHeading({ id, title, href, linkLabel, children }: SectionHeadingProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={id} className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
        <Link
          href={href}
          className="shrink-0 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {linkLabel}
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-muted-foreground">{children}</p>
    </div>
  );
}
