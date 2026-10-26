import { IconArrowLeft, IconMessage } from "@tabler/icons-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DownloadButton } from "@/components/download-button";
import { getTool } from "@/lib/tools";

async function ToolView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tool = await getTool(id);
  if (!tool?.html) notFound();
  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            <IconArrowLeft size={16} aria-hidden />
            Dashboard
          </Link>
          <h1 className="truncate text-sm font-medium">{tool.title}</h1>
        </div>
        <div className="flex gap-2">
          <DownloadButton html={tool.html} />
          <Link href={`/t/${id}`} className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
            <IconMessage size={16} aria-hidden />
            Edit in chat
          </Link>
        </div>
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
