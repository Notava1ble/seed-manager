import { type DiscordProfile } from "@auth/core/providers/discord";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type UserId = Id<"users">;

export function getDiscordUserFields(profile: Record<string, unknown>) {
  const discordId = getRequiredString(profile.discordId);
  const name = getRequiredString(profile.username ?? profile.name);
  const image = getOptionalString(profile.image);

  const fields: {
    discordId: string;
    name: string;
    lowercaseName: string;
    image?: string;
  } = {
    discordId,
    name,
    lowercaseName: name.toLowerCase(),
  };

  if (image) {
    fields.image = image;
  }

  return fields;
}

export async function createPendingDiscordUser(
  ctx: MutationCtx,
  profile: Record<string, unknown>,
) {
  const userFields = getDiscordUserFields(profile);

  return await ctx.db.insert("users", {
    ...userFields,
    status: "pending",
    roles: [],
    homeLeagueId: [],
    hostLeagueId: [],
  });
}

export async function updateUserFromDiscordProfile(
  ctx: MutationCtx,
  userId: UserId,
  profile: Record<string, unknown>,
) {
  const userFields = getDiscordUserFields(profile);

  await ctx.db.patch("users", userId, userFields);
}

export function getDiscordAvatarUrl(profile: DiscordProfile) {
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
