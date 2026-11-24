import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/action-form";
import { AdminSection, TextField } from "@/components/admin/fields";
import { getStaffContext } from "@/lib/admin/access";
import { setPersonAccess } from "@/lib/admin/actions";
import { listAllUniversityNames, listStaff } from "@/lib/admin/queries";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage() {
  const ctx = await getStaffContext();
  if (!ctx) return null;
  if (!ctx.isAdmin) return <p className="text-muted-foreground">Only admins can manage who has access.</p>;

  const [staff, universities] = await Promise.all([listStaff(), listAllUniversityNames()]);

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">People</h1>
      <p className="mt-1 max-w-prose text-muted-foreground">
        Admins can edit every university and manage access. Editors can only edit the universities they&apos;re given.
      </p>

      <AdminSection title="Who has access">
        <ul className="divide-y rounded-lg border">
          {staff.map((person) => (
            <li key={person.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
              <span className="font-medium break-all">{person.email}</span>
              <span className="text-sm text-muted-foreground">
                {person.role === "ADMIN"
                  ? "Admin"
                  : `Editor of ${person.editorOf.map((e) => e.university.shortName).join(", ") || "no universities"}`}
              </span>
            </li>
          ))}
        </ul>
      </AdminSection>

      <AdminSection
        title="Give or change access"
        description="The person must have signed in to Uniroadmap at least once. Choosing an option replaces their current access. People listed in ADMIN_EMAILS always stay admins."
      >
        <ActionForm action={setPersonAccess} submitLabel="Save access">
          <TextField id="p-email" name="email" label="Email" type="email" required className="max-w-md" />
          <fieldset>
            <legend className="text-sm font-medium">Access</legend>
            <div className="mt-2 grid gap-1">
              {[
                { value: "editor", label: "Editor of the universities ticked below" },
                { value: "admin", label: "Admin (every university, and this page)" },
                { value: "student", label: "No editing access" },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2.5 py-1 text-sm">
                  <input type="radio" name="role" value={option.value} defaultChecked={option.value === "editor"} className="size-4 accent-primary" />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">Universities (for editors)</legend>
            <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {universities.map((u) => (
                <label key={u.id} className="flex items-center gap-2.5 py-1 text-sm">
                  <input type="checkbox" name="universities" value={u.id} className="size-4 accent-primary" />
                  {u.shortName} <span className="text-muted-foreground">{u.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </ActionForm>
      </AdminSection>
    </>
  );
}
