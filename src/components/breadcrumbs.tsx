import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { siteConfig } from "@/lib/site";

interface BreadcrumbsProps {
  /** Ancestor pages, from the top down. Home is added automatically. */
  items: { href: string; label: string }[];
  /** The current page's name. */
  current: string;
  /** The current page's path, for structured data. */
  currentHref: string;
}

/** Breadcrumb trail, plus BreadcrumbList structured data for search results. */
export function Breadcrumbs({ items, current, currentHref }: BreadcrumbsProps) {
  const trail = [{ href: "/", label: "Home" }, ...items, { href: currentHref, label: current }];

  return (
    <nav aria-label="Breadcrumb">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: trail.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.label,
            item: `${siteConfig.url}${item.href === "/" ? "" : item.href}`,
          })),
        }}
      />
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item.href} className="flex items-center gap-1.5">
            <Link href={item.href} className="rounded-sm hover:text-foreground hover:underline underline-offset-4">
              {item.label}
            </Link>
            <ChevronRightIcon aria-hidden className="size-3.5" />
          </li>
        ))}
        <li aria-current="page" className="text-foreground">
          {current}
        </li>
      </ol>
    </nav>
  );
}
