import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/action-form";
import { AdminSection, SelectField } from "@/components/admin/fields";
import { UniversityFields } from "@/components/admin/university-fields";
import { canEditUniversity, getStaffContext } from "@/lib/admin/access";
import { addUniversityCourse, deleteUniversity, removeUniversityCourse, updateUniversity } from "@/lib/admin/actions";
import { coursesNotOffered, getUniversityAdmin } from "@/lib/admin/queries";
import type { Ownership } from "@/lib/content/constants";

export default async function AdminUniversityPage({ params }: PageProps<"/admin/universities/[id]">) {
  const { id } = await params;
  const ctx = await getStaffContext();
  if (!ctx) return null;
  if (!canEditUniversity(ctx, id)) return <p className="text-muted-foreground">You don&apos;t have access to this university.</p>;

  const [uni, available] = await Promise.all([getUniversityAdmin(id), coursesNotOffered(id)]);
  if (!uni) notFound();

  return (
    <>
      <p className="text-sm">
        <Link href="/admin" className="text-primary underline underline-offset-4">
          Universities
        </Link>
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {uni.name} <span className="text-muted-foreground">({uni.shortName})</span>
        </h1>
        <Link href={`/universities/${uni.id}`} className="text-sm font-medium text-primary underline underline-offset-4">
          View public page
        </Link>
      </div>

      <AdminSection title="Courses offered" description="Each course here gets its own page with this university's details and curriculum.">
        {uni.courses.length === 0 ? (
          <p className="text-muted-foreground">No courses yet. Add the first one below.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {uni.courses.map((uc) => (
              <li key={uc.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <Link
                    href={`/admin/universities/${uni.id}/courses/${uc.courseId}`}
                    className="font-medium text-primary underline underline-offset-4 hover:no-underline"
                  >
                    {uc.course.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {uc._count.modules === 0 ? "No curriculum yet" : `${uc._count.modules} modules`}
                    {uc.department && `, ${uc.department}`}
                  </p>
                </div>
                <ActionForm
                  action={removeUniversityCourse.bind(null, uni.id, uc.id)}
                  submitLabel="Remove"
                  pendingLabel="Removing…"
                  submitAriaLabel={`Remove ${uc.course.name}`}
                  variant="outline"
                  compact
                  confirm={`Remove ${uc.course.name} and its ${uc._count.modules} modules from ${uni.shortName}? You can undo this from History.`}
                />
              </li>
            ))}
          </ul>
        )}

        {available.length > 0 && (
          <ActionForm action={addUniversityCourse.bind(null, uni.id)} submitLabel="Add course" className="mt-6 max-w-md">
            <SelectField id="add-course" name="courseId" label="Add a course" required>
              <option value="">Choose a course</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
          </ActionForm>
        )}
      </AdminSection>

      <AdminSection title="University details">
        <ActionForm action={updateUniversity.bind(null, uni.id)} submitLabel="Save details">
          <UniversityFields defaults={{ ...uni, ownership: uni.ownership.toLowerCase() as Ownership }} />
        </ActionForm>
      </AdminSection>

      {ctx.isAdmin && (
        <AdminSection
          title="Delete university"
          description="Only possible once every course has been removed. Deleting can be undone from History."
        >
          <ActionForm
            action={deleteUniversity.bind(null, uni.id)}
            submitLabel={`Delete ${uni.shortName}`}
            pendingLabel="Deleting…"
            variant="destructive"
            confirm={`Delete ${uni.name}? You can undo this from History.`}
          />
        </AdminSection>
      )}
    </>
  );
}
