"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Admin sub-navigation. "People" is for admins only. */
export function AdminNav({ isAdmin, who }: { isAdmin: boolean; who: string }) {
  const pathname = usePathname();
  const links = [
    { href: "/admin", label: "Universities", active: pathname === "/admin" || pathname.startsWith("/admin/universities") },
    { href: "/admin/history", label: "History", active: pathname.startsWith("/admin/history") },
    ...(isAdmin ? [{ href: "/admin/people", label: "People", active: pathname.startsWith("/admin/people") }] : []),
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b pb-3">
      <nav aria-label="Admin">
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={link.active ? "page" : undefined}
                className={cn(
                  "rounded-sm py-1 text-sm font-medium underline-offset-4 hover:underline",
                  link.active ? "text-foreground underline decoration-2" : "text-muted-foreground",
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="text-sm text-muted-foreground">{who}</p>
    </div>
  );
}
