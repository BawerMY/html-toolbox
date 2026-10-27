import type { UIMessage } from "ai";

const FENCE_OPEN = /```html[^\n]*\n/gi;

function lastHtmlBlock(text: string): { html: string; closed: boolean } | null {
  const last = [...text.matchAll(FENCE_OPEN)].at(-1);
  if (!last) return null;
  const start = last.index + last[0].length;
  const end = text.indexOf("```", start);
  return { html: (end === -1 ? text.slice(start) : text.slice(start, end)).trim(), closed: end !== -1 };
}

/** Returns the HTML document inside the last ```html block of `text`, or null if there is none
 *  or it is unfinished (still streaming, or the reply was cut off). A block missing only its
 *  closing fence still counts when the document ends with </html>. */
export function extractHtml(text: string): string | null {
  const block = lastHtmlBlock(text);
  if (!block) return null;
  return block.closed || /<\/html>$/i.test(block.html) ? block.html : null;
}

/** True when the last ```html block is started but not finished. */
export function hasUnfinishedHtml(text: string): boolean {
  return lastHtmlBlock(text) !== null && extractHtml(text) === null;
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
  const message = latestHtmlMessage(messages);
  return message ? extractHtml(messageText(message)) : null;
}

/** The assistant message holding the current version of the tool. */
export function latestHtmlMessage(messages: UIMessage[]): UIMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant" && extractHtml(messageText(messages[i]))) return messages[i];
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
