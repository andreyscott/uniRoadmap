import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getStaffContext } from "@/lib/admin/access";
import { listUniversitiesFor } from "@/lib/admin/queries";
import { OWNERSHIP_LABELS, type Ownership } from "@/lib/content/constants";

export default async function AdminHome() {
  const ctx = await getStaffContext();
  if (!ctx) return null; // The layout explains why.
  const universities = await listUniversitiesFor(ctx);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Universities</h1>
          <p className="mt-1 text-muted-foreground">
            {ctx.isAdmin ? "You can edit every university." : "These are the universities you can edit."} Changes go live
            straight away, and every change can be undone from History.
          </p>
        </div>
        {ctx.isAdmin && (
          <Button asChild className="h-10 px-4">
            <Link href="/admin/universities/new">Add a university</Link>
          </Button>
        )}
      </div>

      {universities.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed p-6 text-muted-foreground">
          No universities yet. Run <code>npm run db:seed</code> to add the starter list, or add one yourself.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((u) => (
            <li key={u.id} className="group relative rounded-xl border bg-card p-4 hover:border-primary has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-ring">
              <p className="font-heading text-lg font-bold">
                <Link
                  href={`/admin/universities/${u.id}`}
                  className="underline-offset-4 group-hover:underline after:absolute after:inset-0 focus-visible:outline-none"
                >
                  {u.shortName}
                </Link>
              </p>
              <p className="text-sm">{u.name}</p>
              <p className="mt-2 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                <span>
                  {u.city}, {u.state}
                </span>
                <span>{OWNERSHIP_LABELS[u.ownership.toLowerCase() as Ownership]}</span>
                <span>
                  {u._count.courses} {u._count.courses === 1 ? "course" : "courses"}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
