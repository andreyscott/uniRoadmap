"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

interface NavLinksProps {
  className?: string;
  linkClassName?: string;
  onNavigate?: () => void;
}

/** Primary nav links; marks the current section with aria-current for screen readers. */
export function NavLinks(props: NavLinksProps) {
  return <NavList pathname={usePathname()} {...props} />;
}

/**
 * The same links without the current-section mark, for the static shell of pages whose URL
 * isn't known at build time (reading the path there would block prerendering).
 */
export function StaticNavLinks(props: NavLinksProps) {
  return <NavList pathname={null} {...props} />;
}

function NavList({ pathname, className, linkClassName, onNavigate }: NavLinksProps & { pathname: string | null }) {
  return (
    <ul className={className}>
      {siteConfig.nav.map((item) => {
        const active = pathname !== null && (pathname === item.href || pathname.startsWith(`${item.href}/`));
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md text-muted-foreground transition-colors hover:text-foreground",
                "aria-[current=page]:font-semibold aria-[current=page]:text-foreground",
                linkClassName,
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
