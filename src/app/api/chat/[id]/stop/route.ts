import { stopGeneration } from "@/lib/generations";

export async function POST(_req: Request, ctx: RouteContext<"/api/chat/[id]/stop">) {
  const { id } = await ctx.params;
  return Response.json({ stopped: stopGeneration(id) });
}
