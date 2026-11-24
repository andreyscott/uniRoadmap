import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { getStaffContext } from "@/lib/admin/access";
import { undoEdit } from "@/lib/admin/actions";
import { listHistory } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "History" };

const WHEN = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });

export default async function HistoryPage() {
  const ctx = await getStaffContext();
  if (!ctx) return null;
  const entries = await listHistory(ctx);

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">History</h1>
      <p className="mt-1 max-w-prose text-muted-foreground">
        Every change {ctx.isAdmin ? "anyone has made" : "made to your universities"}, newest first. You can undo the latest change
        to anything; undo newer changes first to go further back. Reordering and access changes are recorded but can&apos;t be undone.
      </p>

      {entries.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed p-6 text-muted-foreground">No changes yet.</p>
      ) : (
        <ol className="mt-8 divide-y rounded-xl border bg-card">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className={entry.undoneAt ? "text-muted-foreground line-through" : "font-medium"}>{entry.summary}</p>
                <p className="text-sm text-muted-foreground">
                  {entry.user?.email ?? "Deleted account"}, {WHEN.format(entry.createdAt)} (Lagos time)
                  {entry.undoneAt && ", undone"}
                </p>
              </div>
              {entry.undoable && (
                <ActionForm
                  action={undoEdit.bind(null, entry.id)}
                  submitLabel="Undo"
                  pendingLabel="Undoing…"
                  submitAriaLabel={`Undo: ${entry.summary}`}
                  variant="outline"
                  compact
                  confirm={`Undo "${entry.summary}"?`}
                />
              )}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
