import type { UIMessage } from "ai";

const FENCE_OPEN = /```html[^\n]*\n/gi;

/** Returns the HTML document inside the last ```html block of `text`, or null.
 *  Also matches an unclosed block, so it works mid-stream. */
export function extractHtml(text: string): string | null {
  const opens = [...text.matchAll(FENCE_OPEN)];
  const last = opens.at(-1);
  if (!last) return null;
  const start = last.index + last[0].length;
  const end = text.indexOf("```", start);
  return (end === -1 ? text.slice(start) : text.slice(start, end)).trim();
}

/** Text of a message with every ```html block removed. */
export function stripHtml(text: string): string {
  return text.replace(/```html[^\n]*\n[\s\S]*?(```|$)/gi, "").trim();
}

export function messageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

/** The most recent HTML produced by the assistant in the conversation. */
export function latestHtml(messages: UIMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== "assistant") continue;
    const html = extractHtml(messageText(messages[i]));
    if (html) return html;
  }
  return null;
}

export function htmlTitle(html: string): string | null {
  return html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || null;
}

/** Filename from the document <title>, e.g. "Pomodoro Timer" -> "pomodoro-timer.html". */
export function htmlFilename(html: string): string {
  const slug = (htmlTitle(html) ?? "tool")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "tool"}.html`;
}
