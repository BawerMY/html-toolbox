import { Suspense } from "react";
import { DiscoverGrid } from "@/components/discover-grid";
import { Sidebar } from "@/components/sidebar";
import { listPublicTools } from "@/lib/tools";

async function PublicTools() {
  const tools = await listPublicTools();
  if (tools.length === 0) {
    return <p className="text-sm text-zinc-500">No public tools yet. Publish one of yours to list it here.</p>;
  }
  return <DiscoverGrid tools={tools} />;
}

export default function DiscoverPage() {
  return (
    <main className="flex h-dvh flex-col lg:flex-row">
      <Sidebar />
      <section className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <h1 className="text-lg font-semibold">Discover</h1>
        <p className="mb-4 text-sm text-zinc-500">Tools people have published. Open one to use it, download it, or fork it.</p>
        <Suspense fallback={<p className="text-sm text-zinc-400">Loading…</p>}>
          <PublicTools />
        </Suspense>
      </section>
    </main>
  );
}
