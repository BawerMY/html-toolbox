import { htmlFilename } from "@/lib/html";

/** Downloads `html` in the browser as a standalone file named from its <title>. */
export function downloadHtml(html: string) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = htmlFilename(html);
  a.click();
  URL.revokeObjectURL(url);
}
