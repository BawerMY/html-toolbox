import { Suspense } from "react";
import { DashboardGrid } from "@/components/dashboard-grid";
import { Sidebar } from "@/components/sidebar";
import { listDashboard } from "@/lib/tools";

async function DashboardTools() {
  const tools = await listDashboard();
  // Keyed on the server data so the grid resets when tools are added, removed, renamed or reordered.
  return <DashboardGrid key={tools.map((t) => `${t.id}:${t.title}`).join("|")} initialTools={tools} />;
}

export default function DashboardPage() {
  return (
    <main className="flex h-screen">
      <Sidebar />
      <section className="flex-1 overflow-y-auto p-6">
        <h1 className="mb-4 text-lg font-semibold">Dashboard</h1>
        <Suspense fallback={<p className="text-sm text-zinc-400">Loading…</p>}>
          <DashboardTools />
        </Suspense>
      </section>
    </main>
  );
}
