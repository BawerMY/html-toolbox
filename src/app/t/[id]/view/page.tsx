import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTool } from "@/lib/tools";

async function ToolView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tool = await getTool(id);
  if (!tool?.html) notFound();
  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            ← Dashboard
          </Link>
          <h1 className="truncate text-sm font-medium">{tool.title}</h1>
        </div>
        <Link href={`/t/${id}`} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
          Edit in chat
        </Link>
      </header>
      <iframe
        title={tool.title}
        srcDoc={tool.html}
        sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
        className="flex-1 bg-white"
      />
    </>
  );
}

export default function ToolViewPage({ params }: PageProps<"/t/[id]/view">) {
  return (
    <main className="flex h-screen flex-col">
      <Suspense>
        <ToolView params={params} />
      </Suspense>
    </main>
  );
}
