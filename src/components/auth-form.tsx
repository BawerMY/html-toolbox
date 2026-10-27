"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const INPUT =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setPending(true);
    setError(null);
    const { error } =
      mode === "signup"
        ? await authClient.signUp.email({ name: String(form.get("name")).trim(), email, password })
        : await authClient.signIn.email({ email, password });
    setPending(false);
    if (error) {
      setError(error.message ?? "Something went wrong. Try again.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {mode === "signup" && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Name</span>
          <input name="name" required autoComplete="name" className={INPUT} />
        </label>
      )}
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Email</span>
        <input name="email" type="email" required autoComplete="email" className={INPUT} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className={INPUT}
        />
        {mode === "signup" && <span className="mt-1 block text-xs text-zinc-500">At least 8 characters.</span>}
      </label>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        {mode === "signup" ? "Already have an account? " : "No account yet? "}
        <Link href={mode === "signup" ? "/login" : "/signup"} className="font-medium text-zinc-900 underline dark:text-zinc-100">
          {mode === "signup" ? "Sign in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}
