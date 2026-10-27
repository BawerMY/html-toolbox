import Link from "next/link";
import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { listPublicTools } from "@/lib/tools";

async function PublicTools() {
  const tools = await listPublicTools();
  if (tools.length === 0) {
    return <p className="text-sm text-zinc-500">No public tools yet. Publish one of yours to list it here.</p>;
  }
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
      {tools.map((tool) => (
        <li key={tool.id}>
          <Link
            href={`/t/${tool.id}/view`}
            className="block rounded-lg border border-zinc-200 bg-white px-4 py-5 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <span className="block truncate text-sm font-medium">{tool.title}</span>
            <span className="mt-1 block truncate text-xs text-zinc-500">by {tool.author}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
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
