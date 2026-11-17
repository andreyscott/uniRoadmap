import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { LogoMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-sm">
          <p className="flex items-center gap-2 font-heading font-bold">
            <LogoMark className="size-5" />
            {siteConfig.name}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Free study roadmaps for university students. Resources link to open courseware,
            videos and books we think are worth your time.
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-muted-foreground hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                My roadmaps
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
