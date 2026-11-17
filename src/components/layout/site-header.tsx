import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="hidden md:block">
          <NavLinks className="flex items-center gap-6" linkClassName="py-2 text-sm" />
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {/* Auth arrives in the "auth + progress" step; this route is a placeholder until then. */}
          <Button asChild variant="outline" className="hidden h-10 px-4 sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
