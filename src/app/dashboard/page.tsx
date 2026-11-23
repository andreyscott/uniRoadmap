import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";

// The shell is static; the user's data loads in the browser from /api/dashboard.
export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "My roadmaps",
  description: "Your saved roadmaps, progress and course finder results.",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">My roadmaps</h1>
      <Dashboard />
    </div>
  );
}
