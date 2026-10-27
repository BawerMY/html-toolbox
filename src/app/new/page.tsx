import { generateId } from "ai";
import { connection } from "next/server";
import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { ToolChat } from "@/components/tool-chat";
import { chatModelOptions } from "@/lib/model";
import { requireUser } from "@/lib/session";

async function NewToolChat() {
  // A fresh id per request; the tool is saved under it after the first reply.
  await connection();
  const user = await requireUser();
  const id = generateId();
  const modelOptions = await chatModelOptions(user.id);
  return (
    <ToolChat
      key={id}
      id={id}
      title=""
      initialMessages={[]}
      initialOnDashboard={false}
      initialPublished={false}
      modelOptions={modelOptions}
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
