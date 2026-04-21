import Discord, { type DiscordProfile } from "@auth/core/providers/discord";
import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

type UserId = Id<"users">;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub({
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.login,
          username: profile.login,
          displayName: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),
    Discord({
      profile(profile) {
        const name = profile.username;

        return {
          id: profile.id,
          discordId: profile.id,
          name,
          username: name,
          email: profile.email,
          image: getDiscordAvatarUrl(profile),
        };
      },
    }),
  ],
  callbacks: {
    /**
     * Fully replace Convex Auth's default upsert logic.
     * Must return either an existing user ID or the newly inserted one.
     */
    async createOrUpdateUser(ctx: MutationCtx, args) {
      if (args.existingUserId) {
        if (args.provider.id === "discord") {
          await updateUserFromDiscordProfile(
            ctx,
            args.existingUserId,
            args.profile,
          );
        }

        return args.existingUserId;
      }

      if (args.provider.id === "discord") {
        const linkedUser = await findUserByEmail(ctx, args.profile.email);

        if (linkedUser) {
          await updateUserFromDiscordProfile(ctx, linkedUser, args.profile);
          return linkedUser;
        }

        return await createPendingDiscordUser(ctx, args.profile);
      }

      return await createPendingGithubUser(ctx, args.profile);
    },
  },
});

async function createPendingDiscordUser(
  ctx: MutationCtx,
  profile: Record<string, unknown>,
) {
  const discordId = getRequiredString(profile.discordId);
  const name = getRequiredString(profile.username ?? profile.name);
  const email = getOptionalString(profile.email);
  const image = getOptionalString(profile.image);

  return await ctx.db.insert("users", {
    discordId,
    email,
    name,
    lowercaseName: name.toLowerCase(),
    image,
    status: "pending",
    roles: [],
    homeLeagueId: [],
    hostLeagueId: [],
  });
}

async function createPendingGithubUser(
  ctx: MutationCtx,
  profile: Record<string, unknown>,
) {
  const email = getOptionalString(profile.email);
  const name = getOptionalString(profile.username);

  if (typeof name !== "string") {
    throw new Error("User login name does not exist");
  }

  if (name.includes("deleted-user")) {
    throw new ConvexError("This username is not allowed");
  }

  const image = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

  return await ctx.db.insert("users", {
    email,
    name,
    lowercaseName: name.toLowerCase(),
    image,
    status: "pending",
    roles: [],
    homeLeagueId: [],
    hostLeagueId: [],
  });
}

async function updateUserFromDiscordProfile(
  ctx: MutationCtx,
  userId: UserId,
  profile: Record<string, unknown>,
) {
  const discordId = getRequiredString(profile.discordId);
  const name = getRequiredString(profile.username ?? profile.name);
  const email = getOptionalString(profile.email);
  const image = getOptionalString(profile.image);

  await ctx.db.patch("users", userId, {
    discordId,
    email,
    name,
    lowercaseName: name.toLowerCase(),
    image,
  });
}

async function findUserByEmail(
  ctx: MutationCtx,
  emailValue: unknown,
): Promise<UserId | null> {
  const email = getOptionalString(emailValue);

  if (!email) {
    return null;
  }

  const users = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .take(2);

  return users.length === 1 ? users[0]._id : null;
}

function getRequiredString(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Expected provider profile to include a string value");
  }

  return value.trim();
}

function getOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getDiscordAvatarUrl(profile: DiscordProfile) {
  if (profile.avatar === null) {
    const defaultAvatarNumber =
      profile.discriminator === "0"
        ? Number(BigInt(profile.id) >> BigInt(22)) % 6
        : Number.parseInt(profile.discriminator, 10) % 5;

    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
  }

  const format = profile.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
}
