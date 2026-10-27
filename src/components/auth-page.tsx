import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/session";

async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/");
  return null;
}

/** Shared layout of the sign-in and sign-up pages. */
export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">{mode === "signup" ? "Create your account" : "Sign in to HTML Toolkit"}</h1>
        <p className="mt-1 mb-5 text-sm text-zinc-500">
          {mode === "signup" ? "Build, save and publish HTML tools." : "Welcome back."}
        </p>
        <AuthForm mode={mode} />
      </div>
      <Link href="/discover" className="fixed top-4 left-4 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        Browse public tools →
      </Link>
    </main>
  );
}
