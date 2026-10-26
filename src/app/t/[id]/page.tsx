import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { ToolChat } from "@/components/tool-chat";
import { resolveSelection } from "@/lib/model-options";
import { loadModels } from "@/lib/models";
import { getTool } from "@/lib/tools";

async function SavedToolChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tool = await getTool(id);
  if (!tool) notFound();
  const models = await loadModels();
  return (
    <ToolChat
      key={id}
      id={id}
      title={tool.title}
      initialMessages={tool.messages}
      initialOnDashboard={tool.onDashboard}
      models={models}
      initialModel={resolveSelection(models, tool.model)}
      isNew={false}
    />
  );
}

async function CurrentSidebar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Sidebar currentId={id} />;
}

export default function ToolPage({ params }: PageProps<"/t/[id]">) {
  return (
    <main className="flex h-screen">
      <Suspense fallback={<Sidebar />}>
        <CurrentSidebar params={params} />
      </Suspense>
      <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-zinc-400">Loading…</div>}>
        <SavedToolChat params={params} />
      </Suspense>
    </main>
  );
}
