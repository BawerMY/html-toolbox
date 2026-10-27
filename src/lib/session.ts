import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type User = { id: string; name: string; email: string };

/** The signed-in user, or null. Reads the request, so callers sit behind <Suspense>. */
export async function getCurrentUser(): Promise<User | null> {
  return userFromHeaders(await headers());
}

/** The signed-in user; sends everyone else to the sign-in page. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For Route Handlers, which have the request at hand. */
export async function userFromHeaders(requestHeaders: Headers): Promise<User | null> {
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, name, email };
}
