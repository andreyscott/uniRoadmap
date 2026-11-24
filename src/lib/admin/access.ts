import "server-only";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { getSessionUser, type SessionUser } from "@/lib/supabase/server";

export interface StaffContext {
  user: SessionUser;
  isAdmin: boolean;
  /** Universities this person may edit. Admins may edit all of them. */
  universityIds: Set<string>;
}

/** Emails in ADMIN_EMAILS are always admins: how the first admin gets in. */
function bootstrapAdmins(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Who is signed in and what they may edit, or null for anyone who isn't an admin or editor.
 * Cached per request, so the layout, page and actions share one lookup. Every page and Server
 * Action calls this itself: layouts and pages render in parallel, so a check in the layout
 * alone wouldn't protect a page.
 */
export const getStaffContext = cache(async (): Promise<StaffContext | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const db = getDb();
  const bootstrap = Boolean(user.email && bootstrapAdmins().has(user.email.toLowerCase()));
  if (bootstrap) {
    // Record the role so bootstrap admins show up in /admin/people like everyone else.
    await db.user.upsert({
      where: { id: user.id },
      create: { id: user.id, email: user.email!, role: "ADMIN" },
      update: { role: "ADMIN" },
    });
  }

  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { role: true, editorOf: { select: { universityId: true } } },
  });
  if (!row || row.role === "STUDENT") return null;
  if (row.role === "ADMIN") return { user, isAdmin: true, universityIds: new Set() };
  const universityIds = new Set(row.editorOf.map((e) => e.universityId));
  return universityIds.size > 0 ? { user, isAdmin: false, universityIds } : null;
});

export function canEditUniversity(ctx: StaffContext, universityId: string): boolean {
  return ctx.isAdmin || ctx.universityIds.has(universityId);
}

/** For Server Actions: the staff context if this person may edit the university, else null. */
export async function staffFor(universityId: string): Promise<StaffContext | null> {
  const ctx = await getStaffContext();
  return ctx && canEditUniversity(ctx, universityId) ? ctx : null;
}

export async function adminOnly(): Promise<StaffContext | null> {
  const ctx = await getStaffContext();
  return ctx?.isAdmin ? ctx : null;
}
