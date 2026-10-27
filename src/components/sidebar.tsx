import { IconCompass, IconLayoutDashboard, IconLogin2, IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { Suspense } from "react";
import { History } from "@/components/history";
import { ProfileMenu } from "@/components/profile-menu";
import { SidebarShell } from "@/components/sidebar-shell";
import { getCurrentUser } from "@/lib/session";

export function Sidebar({ currentId }: { currentId?: string }) {
  return (
    <SidebarShell>
      <nav className="space-y-1 border-b border-zinc-200 p-2 pr-12 lg:pr-2 dark:border-zinc-800">
        <Link href="/" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <IconLayoutDashboard size={16} aria-hidden />
          Dashboard
        </Link>
        <Link href="/discover" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <IconCompass size={16} aria-hidden />
          Discover
        </Link>
        <Link href="/new" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <IconPlus size={16} aria-hidden />
          New tool
        </Link>
      </nav>
      {/* Only the list scrolls; the heading and search stay in place (see HistoryList). */}
      <div className="flex min-h-0 flex-1 flex-col p-2 pb-0">
        <p className="shrink-0 px-2 pb-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">History</p>
        <Suspense fallback={<p className="px-2 py-1.5 text-sm text-zinc-400">Loading…</p>}>
          <History currentId={currentId} />
        </Suspense>
      </div>
      <div className="shrink-0 border-t border-zinc-200 p-2 dark:border-zinc-800">
        <Suspense fallback={<div className="h-11" />}>
          <Profile />
        </Suspense>
      </div>
    </SidebarShell>
  );
}

async function Profile() {
  const user = await getCurrentUser();
  if (user) return <ProfileMenu name={user.name} email={user.email} />;
  return (
    <Link href="/login" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">
      <IconLogin2 size={16} aria-hidden />
      Sign in
    </Link>
  );
}
