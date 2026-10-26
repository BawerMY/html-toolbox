"use client";

import { IconDownload } from "@tabler/icons-react";
import { downloadHtml } from "@/lib/download";

export function DownloadButton({ html }: { html: string | null }) {
  return (
    <button
      onClick={() => html && downloadHtml(html)}
      disabled={!html}
      className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700"
    >
      <IconDownload size={16} aria-hidden />
      Download
    </button>
  );
}
