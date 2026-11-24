"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { Button } from "@/components/ui/button";
import { signOut, useAuth, useProfile } from "./auth-provider";

const ITEM =
  "flex w-full cursor-pointer items-center rounded-md px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-muted";

/** Header account control: "Sign in" when signed out, an account menu when signed in. */
export function AccountMenu() {
  const auth = useAuth();
  const { profile } = useProfile();
  const pathname = usePathname();

  if (auth.status === "unavailable") return null;

  if (auth.status === "loading") return <AccountMenuPlaceholder />;

  if (auth.status === "signed-out") {
    return (
      <Button asChild variant="outline" className="hidden h-10 px-4 sm:inline-flex">
        <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link>
      </Button>
    );
  }

  const email = auth.user.email ?? "your account";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-10 rounded-full">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-full bg-primary font-heading font-bold text-primary-foreground"
          >
            {email.charAt(0).toUpperCase()}
          </span>
          <span className="sr-only">Account menu</span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          <DropdownMenu.Label className="px-2.5 py-2 text-sm text-muted-foreground">
            Signed in as
            <span className="block max-w-60 truncate font-medium text-foreground">{email}</span>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild className={ITEM}>
            <Link href="/dashboard">My roadmaps</Link>
          </DropdownMenu.Item>
          {profile?.university && (
            <DropdownMenu.Item asChild className={ITEM}>
              <Link href={`/universities/${profile.university.id}`}>My university ({profile.university.shortName})</Link>
            </DropdownMenu.Item>
          )}
          {profile?.canEdit && (
            <DropdownMenu.Item asChild className={ITEM}>
              <Link href="/admin">Admin</Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item className={ITEM} onSelect={() => void signOut()}>
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Holds the account control's space so the header doesn't shift while it loads. */
export function AccountMenuPlaceholder() {
  return <span aria-hidden className="hidden h-10 w-[5.25rem] sm:block" />;
}
