"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Flips the `dark` class set by ThemeScript and remembers the choice.
 * Icons switch purely via CSS (`dark:` variants), so the server and client render
 * identical markup and there is no hydration mismatch.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const dark = root.classList.toggle("dark");
    root.style.colorScheme = dark ? "dark" : "light";
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // Storage can be blocked (private mode); the theme still applies for this visit.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-10"
      onClick={toggle}
      aria-label="Toggle dark mode"
    >
      <Moon className="size-5 dark:hidden" aria-hidden />
      <Sun className="hidden size-5 dark:block" aria-hidden />
    </Button>
  );
}
