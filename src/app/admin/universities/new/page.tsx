import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/admin/action-form";
import { AdminSection, TextField } from "@/components/admin/fields";
import { UniversityFields } from "@/components/admin/university-fields";
import { getStaffContext } from "@/lib/admin/access";
import { createUniversity } from "@/lib/admin/actions";

export const metadata: Metadata = { title: "Add a university" };

export default async function NewUniversityPage() {
  const ctx = await getStaffContext();
  if (!ctx) return null;
  if (!ctx.isAdmin) return <p className="text-muted-foreground">Only admins can add universities.</p>;

  return (
    <>
      <p className="text-sm">
        <Link href="/admin" className="text-primary underline underline-offset-4">
          Universities
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Add a university</h1>
      <AdminSection title="Details">
        <ActionForm action={createUniversity} submitLabel="Add university">
          <UniversityFields />
          <TextField
            id="u-id"
            name="id"
            label="Web address"
            required
            placeholder="uniben"
            hint="Used in links like /universities/uniben. Lowercase letters, numbers and hyphens. It can't be changed later."
          />
        </ActionForm>
      </AdminSection>
    </>
  );
}
