import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/lib/db";
import { claimUnownedTools } from "@/lib/tools";

export const auth = betterAuth({
  // The local mongod is a single server without a replica set, so it has no transactions.
  database: mongodbAdapter(getDb(), { transaction: false }),
  emailAndPassword: { enabled: true },
  // Lets Server Actions set auth cookies.
  plugins: [nextCookies()],
  databaseHooks: {
    user: {
      create: {
        // Tools made before accounts existed go to the first person who signs up.
        after: async (user) => {
          await claimUnownedTools(user.id);
        },
      },
    },
  },
});
