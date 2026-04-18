import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";
import { MutationCtx } from "./_generated/server";

import { ConvexError } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub({
      // issuer: "https://github.com/login/oauth",
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.login, // unique github name
          username: profile.login,
          displayName: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),
  ],
  callbacks: {
    /**
     * Fully replace Convex Auth’s default upsert logic.
     * Must return either an existing user ID or the newly inserted one.
     */
    async createOrUpdateUser(ctx: MutationCtx, args) {
      if (args.existingUserId) {
        return args.existingUserId;
      }

      const email = args.profile.email;

      // const emailVerificationTime =
      //   args.profile.emailVerified === true ? Date.now() : undefined;
      // const phoneVerificationTime =
      //   args.profile.phoneVerified === true ? Date.now() : undefined;

      // Validate name for password provider
      const name = args.profile.username as string;
      if (typeof name !== "string")
        throw new Error("User login name does not exist");

      if (name.includes("deleted-user")) {
        throw new ConvexError("This username is not allowed");
      }
      const image = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

      const userId = await ctx.db.insert("users", {
        email,
        name: name,
        lowercaseName: name.toLowerCase(),
        image,
        status: "pending",
        roles: [],
        homeLeagueId: [],
        hostLeagueId: [],
      });

      return userId;
    },
  },
});
