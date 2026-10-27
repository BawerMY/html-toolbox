import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { ToolChat } from "@/components/tool-chat";
import { chatModelOptions } from "@/lib/model";
import { requireUser } from "@/lib/session";
import { getOwnTool } from "@/lib/tools";

async function SavedToolChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const tool = await getOwnTool(id, user.id);
  if (!tool) notFound();
  const modelOptions = await chatModelOptions(user.id, tool.model);
  return (
    <ToolChat
      key={id}
      id={id}
      title={tool.title}
      initialMessages={tool.messages}
      initialOnDashboard={tool.onDashboard}
      initialPublished={tool.published ?? false}
      modelOptions={modelOptions}
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
    <main className="flex h-dvh flex-col lg:flex-row">
      <Suspense fallback={<Sidebar />}>
        <CurrentSidebar params={params} />
      </Suspense>
      <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-zinc-400">Loading…</div>}>
        <SavedToolChat params={params} />
      </Suspense>
    </main>
  );
}
