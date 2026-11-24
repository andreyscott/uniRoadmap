"use client";

import { useActionState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/admin/validation";
import { cn } from "@/lib/utils";

const IDLE: FormState = { status: "idle" };

interface ActionFormProps {
  /** A Server Action, usually with its ids bound: updateUniversity.bind(null, id). */
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel?: string;
  /** Accessible name when the visible label is short, e.g. "Move CSC 211 up". */
  submitAriaLabel?: string;
  /** Asks before submitting; for deletes and removals. */
  confirm?: string;
  variant?: "default" | "outline" | "destructive" | "ghost";
  /** Small buttons for row actions, with the result message beside them. */
  compact?: boolean;
  className?: string;
  children?: ReactNode;
}

/** A form for an admin Server Action that shows the action's result next to its button. */
export function ActionForm({
  action,
  submitLabel,
  pendingLabel = "Saving…",
  submitAriaLabel,
  confirm,
  variant = "default",
  compact = false,
  className,
  children,
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, IDLE);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={cn(!compact && "grid gap-4", className)}
    >
      {children}
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", compact && "inline-flex")}>
        <Button
          type="submit"
          variant={variant}
          disabled={pending}
          aria-label={submitAriaLabel}
          className={compact ? "h-8 px-2.5" : "h-10 px-4"}
        >
          {pending ? pendingLabel : submitLabel}
        </Button>
        {state.status !== "idle" && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={cn("text-sm", state.status === "error" ? "text-destructive" : "text-status-done")}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
