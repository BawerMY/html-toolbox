import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ToolActions, VisitorToolActions } from "@/components/tool-actions";
import { getCurrentUser } from "@/lib/session";
import { canView, getTool, userNames } from "@/lib/tools";

async function ToolView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tool, user] = await Promise.all([getTool(id), getCurrentUser()]);
  // Private tools look missing to everyone but their owner.
  if (!tool?.html || !canView(tool, user?.id)) notFound();
  const isOwner = tool.ownerId === user?.id;
  const author = isOwner ? null : (await userNames(tool.ownerId ? [tool.ownerId] : [])).get(tool.ownerId ?? "");

  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={isOwner ? "/" : "/discover"}
            title={isOwner ? "Dashboard" : "Discover"}
            className="flex shrink-0 items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <IconArrowLeft size={16} aria-hidden />
            <span className="sr-only sm:not-sr-only">{isOwner ? "Dashboard" : "Discover"}</span>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-medium">{tool.title}</h1>
            {author && <p className="truncate text-xs text-zinc-500">by {author}</p>}
          </div>
        </div>
        {isOwner ? (
          <ToolActions
            id={id}
            title={tool.title}
            html={tool.html}
            onDashboard={tool.onDashboard}
            published={tool.published ?? false}
            page="tool"
            labelsFrom="lg"
          />
        ) : (
          <VisitorToolActions id={id} html={tool.html} signedIn={user !== null} />
        )}
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
    <main className="flex h-dvh flex-col">
      <Suspense>
        <ToolView params={params} />
      </Suspense>
    </main>
  );
}
