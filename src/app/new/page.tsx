import { generateId } from "ai";
import { connection } from "next/server";
import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { ToolChat } from "@/components/tool-chat";
import { resolveSelection } from "@/lib/model-options";
import { loadModels } from "@/lib/models";
import { lastUsedModel } from "@/lib/tools";

async function NewToolChat() {
  // A fresh id per request; the tool is saved under it after the first reply.
  await connection();
  const id = generateId();
  const models = await loadModels();
  return (
    <ToolChat
      key={id}
      id={id}
      title=""
      initialMessages={[]}
      initialOnDashboard={false}
      models={models}
      initialModel={resolveSelection(models, await lastUsedModel())}
      isNew
    />
  );
}

export default function NewToolPage() {
  return (
    <main className="flex h-dvh flex-col lg:flex-row">
      <Sidebar />
      <Suspense>
        <NewToolChat />
      </Suspense>
    </main>
  );
}
