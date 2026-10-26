import { createUIMessageStreamResponse } from "ai";
import { subscribe } from "@/lib/generations";

/** Reconnects to a running generation (used by useChat's `resume`). 204 if there is none. */
export async function GET(_req: Request, ctx: RouteContext<"/api/chat/[id]/stream">) {
  const { id } = await ctx.params;
  const stream = subscribe(id);
  if (!stream) return new Response(null, { status: 204 });
  return createUIMessageStreamResponse({ stream });
}
