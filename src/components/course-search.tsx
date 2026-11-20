import Form from "next/form";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CourseSearchProps {
  /** Must be unique on the page. */
  id?: string;
  defaultValue?: string;
  className?: string;
}

/**
 * Search box that sends the query to the course directory as `/courses?q=…`.
 * next/form makes this a client-side navigation, and it still works as a plain GET form without JS.
 */
export function CourseSearch({ id = "course-search", defaultValue, className }: CourseSearchProps) {
  return (
    <Form action="/courses" role="search" aria-label="Courses" className={cn("flex gap-2", className)}>
      <label htmlFor={id} className="sr-only">
        Search courses
      </label>
      <div className="relative min-w-0 flex-1">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder="Course or subject"
          enterKeyHint="search"
          autoComplete="off"
          className="h-12 bg-card pl-11 text-base md:text-base"
        />
      </div>
      <Button type="submit" className="h-12 px-5 text-base">
        Search
      </Button>
    </Form>
  );
}
