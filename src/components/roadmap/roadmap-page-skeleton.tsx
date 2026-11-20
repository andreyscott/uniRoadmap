/**
 * Placeholder for a course or skill page while its content streams in after a client-side
 * navigation (direct visits get the fully prerendered page instead). Mirrors the real layout
 * so nothing jumps when the content arrives.
 */
export function RoadmapPageSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading roadmap</span>
      <div aria-hidden className="animate-pulse">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="mt-6 h-10 w-3/4 max-w-lg rounded-lg bg-muted sm:h-12" />
        <div className="mt-5 h-4 w-full max-w-2xl rounded bg-muted" />
        <div className="mt-2 h-4 w-2/3 max-w-xl rounded bg-muted" />
        <div className="mt-8 flex gap-10">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-24 rounded bg-muted" />
          ))}
        </div>
        <div className="mt-14 h-8 w-40 rounded bg-muted" />
        <div className="relative mt-10 space-y-3 pl-14">
          <span className="absolute top-0 bottom-0 left-[27px] w-1.5 rounded bg-muted" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-11 max-w-2xl rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
