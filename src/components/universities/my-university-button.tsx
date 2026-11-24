"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { useAuth, useProfile } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { setMyUniversity } from "@/lib/universities/actions";

/** "Set as my university" on a university page, or a note that it already is. */
export function MyUniversityButton({ universityId, shortName }: { universityId: string; shortName: string }) {
  const auth = useAuth();
  const { profile, reload } = useProfile();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.status === "unavailable" || auth.status === "loading") return null;
  if (auth.status === "signed-out") {
    return (
      <p className="text-sm text-muted-foreground">
        Study at {shortName}?{" "}
        <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="font-medium text-primary underline underline-offset-4">
          Sign in
        </Link>{" "}
        to make it your university, so its courses open first.
      </p>
    );
  }
  if (!profile) return null;

  const isMine = profile.university?.id === universityId;
  const change = async (value: string | null) => {
    setPending(true);
    setError(null);
    const result = await setMyUniversity(value);
    setPending(false);
    if (result.ok) reload();
    else setError(result.error);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {isMine ? (
        <>
          <p className="flex items-center gap-1.5 text-sm font-medium text-status-done">
            <CheckIcon aria-hidden className="size-4" /> Your university
          </p>
          <Button type="button" variant="ghost" className="h-9 px-3" disabled={pending} onClick={() => change(null)}>
            Remove
          </Button>
        </>
      ) : (
        <Button type="button" variant="outline" className="h-10 px-4" disabled={pending} onClick={() => change(universityId)}>
          {pending ? "Saving…" : `Set ${shortName} as my university`}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
