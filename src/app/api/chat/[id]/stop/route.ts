import { stopGeneration } from "@/lib/generations";
import { userFromHeaders } from "@/lib/session";
import { getOwnTool } from "@/lib/tools";

export async function POST(req: Request, ctx: RouteContext<"/api/chat/[id]/stop">) {
  const { id } = await ctx.params;
  const user = await userFromHeaders(req.headers);
  if (!user || !(await getOwnTool(id, user.id))) return new Response("Tool not found", { status: 404 });
  return Response.json({ stopped: stopGeneration(id) });
}
