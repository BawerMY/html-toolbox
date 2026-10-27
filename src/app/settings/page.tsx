import { Suspense } from "react";
import { ProviderForm } from "@/components/provider-form";
import { Sidebar } from "@/components/sidebar";
import { defaultModelId } from "@/lib/model";
import { requireUser } from "@/lib/session";
import { getProviderSummary } from "@/lib/settings";

async function SettingsContent() {
  const user = await requireUser();
  const saved = await getProviderSummary(user.id);
  return (
    <div className="max-w-xl space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold">Account</h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-zinc-500">Name</dt>
          <dd className="truncate">{user.name}</dd>
          <dt className="text-zinc-500">Email</dt>
          <dd className="truncate">{user.email}</dd>
        </dl>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-semibold">Model</h2>
        <ProviderForm saved={saved} defaultModel={defaultModelId()} />
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <main className="flex h-dvh flex-col lg:flex-row">
      <Sidebar />
      <section className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <h1 className="mb-6 text-lg font-semibold">Settings</h1>
        <Suspense fallback={<p className="text-sm text-zinc-400">Loading…</p>}>
          <SettingsContent />
        </Suspense>
      </section>
    </main>
  );
}
