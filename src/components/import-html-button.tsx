"use client";

import { IconFileImport } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { importToolAction } from "@/app/actions";

// Server Actions accept request bodies up to 1 MB by default.
const MAX_BYTES = 900_000;

/** Picks a local .html file and turns it into a new tool. */
export function ImportHtmlButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, startTransition] = useTransition();

  async function importFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("This file is too big to import (max 900 KB).");
      return;
    }
    const html = await file.text();
    startTransition(async () => {
      const result = await importToolAction(html, file.name);
      if ("error" in result) setError(result.error);
      else router.push(`/t/${result.id}`);
    });
  }

  return (
    <div>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={importing}
        className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700"
      >
        <IconFileImport size={16} aria-hidden />
        {importing ? "Importing…" : "Import HTML file"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm,text/html"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) importFile(file);
        }}
      />
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
