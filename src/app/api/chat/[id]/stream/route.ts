import { createUIMessageStreamResponse } from "ai";
import { subscribe } from "@/lib/generations";
import { userFromHeaders } from "@/lib/session";
import { getOwnTool } from "@/lib/tools";

/** Reconnects to a running generation (used by useChat's `resume`). 204 if there is none. */
export async function GET(req: Request, ctx: RouteContext<"/api/chat/[id]/stream">) {
  const { id } = await ctx.params;
  const user = await userFromHeaders(req.headers);
  if (!user || !(await getOwnTool(id, user.id))) return new Response(null, { status: 204 });
  const stream = subscribe(id);
  if (!stream) return new Response(null, { status: 204 });
  return createUIMessageStreamResponse({ stream });
}
