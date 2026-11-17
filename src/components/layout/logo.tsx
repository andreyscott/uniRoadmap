import Link from "next/link";
import { siteConfig } from "@/lib/site";

/** Brand mark: two transit "lines" meeting at an interchange stop. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <path
        d="M4 24 H12 L20 8 H28"
        fill="none"
        stroke="var(--line-engineering)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 8 H10 L16 16 L22 24 H28"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="4.5" fill="var(--background)" stroke="var(--foreground)" strokeWidth="2.5" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-md font-heading text-lg font-extrabold tracking-tight"
    >
      <LogoMark className="size-7" />
      {siteConfig.name}
    </Link>
  );
}
