import { AccountMenu } from "@/components/auth/account-menu";
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
          <AccountMenu />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
