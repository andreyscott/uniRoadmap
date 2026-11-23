"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { NavLinks } from "./nav-links";

/** Disclosure-style menu for small screens. Closes on link tap and on Escape. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const auth = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </Button>

      <nav
        id={menuId}
        aria-label="Main"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b bg-background px-4 pb-4 shadow-sm"
      >
        <NavLinks
          className="flex flex-col"
          linkClassName="block py-3 text-base"
          onNavigate={() => setOpen(false)}
        />
        {auth.status === "signed-out" && (
          <Link
            href={`/login?next=${encodeURIComponent(pathname)}`}
            onClick={() => setOpen(false)}
            className="mt-1 block border-t py-3 text-base font-medium text-primary"
          >
            Sign in
          </Link>
        )}
        {auth.status === "signed-in" && (
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="mt-1 block border-t py-3 text-base font-medium text-primary"
          >
            My roadmaps
          </Link>
        )}
      </nav>
    </div>
  );
}
