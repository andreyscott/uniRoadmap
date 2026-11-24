import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/action-form";
import { AdminSection, TextAreaField, TextField } from "@/components/admin/fields";
import { ModuleFields, type TopicOption } from "@/components/admin/module-fields";
import { canEditUniversity, getStaffContext } from "@/lib/admin/access";
import { addModule, deleteModule, moveModule, updateModule, updateUniversityCourse } from "@/lib/admin/actions";
import { getUniversityCourseAdmin } from "@/lib/admin/queries";
import { NODE_TYPE_LABELS, SEMESTER_LABELS, type NodeType, type Semester } from "@/lib/content/constants";
import { getCourse } from "@/lib/content/load";

type Module = NonNullable<Awaited<ReturnType<typeof getUniversityCourseAdmin>>>["modules"][number];

const lower = <T extends string>(value: string | null) => (value ? (value.toLowerCase().replaceAll("_", "-") as T) : null);

export default async function AdminUniversityCoursePage({ params }: PageProps<"/admin/universities/[id]/courses/[courseId]">) {
  const { id, courseId } = await params;
  const ctx = await getStaffContext();
  if (!ctx) return null;
  if (!canEditUniversity(ctx, id)) return <p className="text-muted-foreground">You don&apos;t have access to this university.</p>;

  const uc = await getUniversityCourseAdmin(id, courseId);
  if (!uc) notFound();
  const general = getCourse(courseId);
  const years = uc.durationYears ?? uc.course.durationYears;
  const topics: TopicOption[] = (general?.roadmap?.nodes ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    stageTitle: general!.roadmap!.stages.find((s) => s.stage === n.stage)?.title ?? `Stage ${n.stage}`,
  }));
  const topicTitle = new Map(topics.map((t) => [t.id, t.title]));

  return (
    <>
      <p className="flex flex-wrap gap-x-2 text-sm">
        <Link href="/admin" className="text-primary underline underline-offset-4">
          Universities
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/admin/universities/${id}`} className="text-primary underline underline-offset-4">
          {uc.university.shortName}
        </Link>
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {uc.course.name} <span className="text-muted-foreground">at {uc.university.shortName}</span>
        </h1>
        <Link href={`/universities/${id}/${courseId}`} className="text-sm font-medium text-primary underline underline-offset-4">
          View public page
        </Link>
      </div>

      <AdminSection
        title="Curriculum"
        description="The modules students take, year by year. Copy codes, titles and units from the department's official handbook."
      >
        {Array.from({ length: years }, (_, i) => i + 1).map((year) => {
          const inYear = uc.modules.filter((m) => m.year === year);
          const groups: { semester: Semester | null; modules: Module[] }[] = [
            { semester: "first", modules: inYear.filter((m) => m.semester === "FIRST") },
            { semester: "second", modules: inYear.filter((m) => m.semester === "SECOND") },
            { semester: null, modules: inYear.filter((m) => m.semester === null) },
          ];
          return (
            <div key={year} className="mt-6 first:mt-0">
              <h3 className="font-heading text-lg font-bold">Year {year}</h3>
              {inYear.length === 0 && <p className="mt-1 text-sm text-muted-foreground">No modules yet.</p>}
              {groups
                .filter((g) => g.modules.length > 0)
                .map((group) => (
                  <div key={group.semester ?? "all"} className="mt-3">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {group.semester ? SEMESTER_LABELS[group.semester] : "All year"}
                    </h4>
                    <ol className="mt-2 divide-y rounded-lg border">
                      {group.modules.map((m, index) => (
                        <li key={m.id} className="px-4 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">
                                <span className="tabular-nums">{m.code}</span> {m.title}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {[
                                  m.creditUnits !== null && `${m.creditUnits} ${m.creditUnits === 1 ? "unit" : "units"}`,
                                  NODE_TYPE_LABELS[lower<NodeType>(m.type)!],
                                  m.topicId && `covers "${topicTitle.get(m.topicId) ?? m.topicId}"`,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {index > 0 && (
                                <ActionForm
                                  action={moveModule.bind(null, id, uc.id, m.id, "up")}
                                  submitLabel="Up"
                                  pendingLabel="…"
                                  submitAriaLabel={`Move ${m.code} up`}
                                  variant="outline"
                                  compact
                                />
                              )}
                              {index < group.modules.length - 1 && (
                                <ActionForm
                                  action={moveModule.bind(null, id, uc.id, m.id, "down")}
                                  submitLabel="Down"
                                  pendingLabel="…"
                                  submitAriaLabel={`Move ${m.code} down`}
                                  variant="outline"
                                  compact
                                />
                              )}
                              <ActionForm
                                action={deleteModule.bind(null, id, uc.id, m.id)}
                                submitLabel="Delete"
                                pendingLabel="Deleting…"
                                submitAriaLabel={`Delete ${m.code}`}
                                variant="outline"
                                compact
                                confirm={`Delete ${m.code} ${m.title}? You can undo this from History.`}
                              />
                            </div>
                          </div>
                          <details className="mt-2">
                            <summary className="w-fit cursor-pointer rounded-sm text-sm font-medium text-primary">
                              Edit {m.code}
                            </summary>
                            <ActionForm
                              action={updateModule.bind(null, id, uc.id, m.id)}
                              submitLabel="Save module"
                              className="mt-3 rounded-lg bg-muted/50 p-4"
                            >
                              <ModuleFields
                                idPrefix={m.id}
                                years={years}
                                topics={topics}
                                defaults={{
                                  ...m,
                                  semester: lower<Semester>(m.semester),
                                  type: lower<NodeType>(m.type)!,
                                }}
                              />
                            </ActionForm>
                          </details>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
            </div>
          );
        })}

        <div className="mt-8 border-t pt-6">
          <h3 className="font-heading text-lg font-bold">Add a module</h3>
          <ActionForm action={addModule.bind(null, id, uc.id)} submitLabel="Add module" className="mt-3">
            <ModuleFields idPrefix="new-module" years={years} topics={topics} />
          </ActionForm>
        </div>
      </AdminSection>

      <AdminSection title="Course details at this university">
        <ActionForm action={updateUniversityCourse.bind(null, id, uc.id)} submitLabel="Save details">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="uc-department" name="department" label="Department" defaultValue={uc.department} placeholder="Department of Computer Science" />
            <TextField id="uc-faculty" name="faculty" label="Faculty" defaultValue={uc.faculty} placeholder="Faculty of Physical Sciences" />
          </div>
          <TextField
            id="uc-years"
            name="durationYears"
            label="Length in years"
            inputMode="numeric"
            defaultValue={uc.durationYears}
            hint={`Leave blank to use the general length (${uc.course.durationYears} years).`}
            className="max-w-xs"
          />
          <TextAreaField
            id="uc-utme"
            name="utmeSubjects"
            label="UTME subject combination"
            hint="One subject per line, as the university writes it."
            defaultValue={uc.utmeSubjects.join("\n")}
            rows={4}
          />
          <TextAreaField
            id="uc-admission"
            name="admissionNotes"
            label="Admission notes"
            hint="Cut-off marks, post-UTME screening, O'Level requirements. Say which year a cut-off is from."
            defaultValue={uc.admissionNotes}
          />
          <TextAreaField id="uc-notes" name="notes" label="Other notes" defaultValue={uc.notes} />
        </ActionForm>
      </AdminSection>
    </>
  );
}
