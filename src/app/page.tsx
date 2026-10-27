import { Suspense } from "react";
import { DashboardGrid } from "@/components/dashboard-grid";
import { Sidebar } from "@/components/sidebar";
import { requireUser } from "@/lib/session";
import { listDashboard } from "@/lib/tools";

async function DashboardTools() {
  const user = await requireUser();
  const tools = await listDashboard(user.id);
  // Keyed on the server data so the grid resets when tools are added, removed, renamed or reordered.
  return <DashboardGrid key={tools.map((t) => `${t.id}:${t.title}`).join("|")} initialTools={tools} />;
}

export default function DashboardPage() {
  return (
    <main className="flex h-dvh flex-col lg:flex-row">
      <Sidebar />
      <section className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <h1 className="mb-4 text-lg font-semibold">Dashboard</h1>
        <Suspense fallback={<p className="text-sm text-zinc-400">Loading…</p>}>
          <DashboardTools />
        </Suspense>
      </section>
    </main>
  );
}
