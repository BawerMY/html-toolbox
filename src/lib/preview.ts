/** Message the preview iframe posts to the app when the tool throws. */
export type ToolErrorMessage = { type: "tool-error"; message: string };

// Reports uncaught errors to the parent page. The iframe can load before the app is listening,
// so errors are kept and sent again when the app asks. One line, so the tool's line numbers don't shift.
const ERROR_REPORTER =
  '<script>(function(){var errors=[];function post(m){parent.postMessage({type:"tool-error",message:m},"*")}' +
  'function report(m){m=String(m);errors.push(m);post(m)}' +
  'addEventListener("error",function(e){report(e.message+(e.lineno?" (line "+e.lineno+")":""))});' +
  'addEventListener("unhandledrejection",function(e){var r=e.reason;report("Unhandled promise rejection: "+(r&&r.message||r))});' +
  'addEventListener("message",function(e){if(e.source===parent&&e.data&&e.data.type==="resend-tool-errors")errors.forEach(post)})})()</script>';

/** Sent to the preview iframe to get errors it reported before the app was listening. */
export const RESEND_TOOL_ERRORS = { type: "resend-tool-errors" };

/** The tool's HTML with the error reporter added, for the in-app preview only (not downloads). */
export function previewHtml(html: string): string {
  const head = html.match(/<head[^>]*>/i);
  if (!head) return ERROR_REPORTER + html;
  const at = head.index! + head[0].length;
  return html.slice(0, at) + ERROR_REPORTER + html.slice(at);
}

export function isToolErrorMessage(data: unknown): data is ToolErrorMessage {
  return typeof data === "object" && data !== null && (data as ToolErrorMessage).type === "tool-error";
}
