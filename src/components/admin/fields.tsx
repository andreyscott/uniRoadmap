import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const CONTROL =
  "w-full min-w-0 rounded-lg border border-input bg-card px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 md:text-sm";

interface FieldProps {
  /** Must be unique on the page (prefix with a row id when a form repeats). */
  id: string;
  name: string;
  label: string;
  hint?: ReactNode;
  className?: string;
}

function Label({ id, label, hint }: { id: string; label: string; hint?: ReactNode }) {
  return (
    <>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
    </>
  );
}

export function TextField({
  id,
  name,
  label,
  hint,
  className,
  defaultValue,
  required,
  type = "text",
  placeholder,
  list,
  inputMode,
}: FieldProps & {
  defaultValue?: string | number | null;
  required?: boolean;
  type?: string;
  placeholder?: string;
  list?: string;
  inputMode?: "numeric" | "url" | "text";
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label id={id} label={label} hint={hint} />
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        list={list}
        inputMode={inputMode}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn(CONTROL, "h-10")}
      />
    </div>
  );
}

export function TextAreaField({
  id,
  name,
  label,
  hint,
  className,
  defaultValue,
  rows = 3,
}: FieldProps & { defaultValue?: string | null; rows?: number }) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label id={id} label={label} hint={hint} />
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn(CONTROL, "py-2")}
      />
    </div>
  );
}

export function SelectField({
  id,
  name,
  label,
  hint,
  className,
  defaultValue,
  required,
  children,
}: FieldProps & { defaultValue?: string | number | null; required?: boolean; children: ReactNode }) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label id={id} label={label} hint={hint} />
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn(CONTROL, "h-10")}
      >
        {children}
      </select>
    </div>
  );
}

/** A titled block on an admin page. */
export function AdminSection({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-10 rounded-xl border bg-card p-5 sm:p-6">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {description && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
