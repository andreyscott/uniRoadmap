import { Suspense } from "react";
import { Menu } from "lucide-react";
import { AccountMenu, AccountMenuPlaceholder } from "@/components/auth/account-menu";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NavLinks, StaticNavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

/*
 * The nav, account menu and mobile menu read the current path. On pages whose URL is only
 * known at request time (university pages, admin), that read must sit inside Suspense so the
 * rest of the page can still prerender; the fallbacks are look-alikes without path-based state.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="hidden md:block">
          <Suspense fallback={<StaticNavLinks className="flex items-center gap-6" linkClassName="py-2 text-sm" />}>
            <NavLinks className="flex items-center gap-6" linkClassName="py-2 text-sm" />
          </Suspense>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Suspense fallback={<AccountMenuPlaceholder />}>
            <AccountMenu />
          </Suspense>
          <Suspense
            fallback={
              <div className="md:hidden">
                <Button type="button" variant="ghost" size="icon" className="size-10" aria-label="Open menu" disabled>
                  <Menu className="size-5" aria-hidden />
                </Button>
              </div>
            }
          >
            <MobileNav />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
