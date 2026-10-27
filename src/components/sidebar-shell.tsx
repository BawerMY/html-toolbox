"use client";

import { IconMenu2, IconX } from "@tabler/icons-react";
import { useState } from "react";

/** Fixed sidebar on large screens; a drawer opened from a top bar on smaller ones. */
export function SidebarShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 px-2 py-2 lg:hidden dark:border-zinc-800">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <IconMenu2 size={20} aria-hidden />
        </button>
        <span className="text-sm font-semibold">HTML Toolkit</span>
      </div>
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" aria-hidden />}
      <aside
        // Following a link inside the drawer closes it.
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-zinc-200 bg-white transition-transform lg:static lg:z-auto lg:w-60 lg:shrink-0 lg:translate-x-0 lg:transition-none dark:border-zinc-800 dark:bg-zinc-950 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute top-2 right-2 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden dark:hover:bg-zinc-800"
        >
          <IconX size={18} aria-hidden />
        </button>
        {children}
      </aside>
    </>
  );
}
