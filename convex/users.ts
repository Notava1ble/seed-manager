import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { getUser, requireActiveUser, requireAdmin } from "./lib/permissions";

const MAX_USER_LIST_COUNT = 1000;

const managedRoleValidator = v.union(
  v.literal("host"),
  v.literal("uploader"),
  v.literal("tester"),
);
const ALL_ROLE_ORDER = ["admin", "host", "uploader", "tester"] as const;
const MANAGED_ROLE_ORDER = ["host", "uploader", "tester"] as const;

type UserRole = (typeof ALL_ROLE_ORDER)[number];
type ManagedRole = (typeof MANAGED_ROLE_ORDER)[number];

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getUser(ctx);
  },
});

export const updateAccountSettings = mutation({
  args: {
    claimBuriedTreasureSeeds: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);

    await ctx.db.patch("users", user._id, {
      settings: {
        ...user.settings,
        claimBuriedTreasureSeeds: args.claimBuriedTreasureSeeds,
      },
    });
  },
});

export const listActiveUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db
      .query("users")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(MAX_USER_LIST_COUNT);

    return users;
  },
});
export const listActiveUsersAPI = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(MAX_USER_LIST_COUNT);

    return users;
  },
});

export const listPendingUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db
      .query("users")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(MAX_USER_LIST_COUNT);

    return users;
  },
});

export const activateUserByDiscordId = mutation({
  args: {
    discordId: v.string(),
    roles: v.array(managedRoleValidator),
    makeAdmin: v.boolean(),
    uploaderLeagueIds: v.array(v.id("leagues")),
    hostLeagueId: v.array(v.id("leagues")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const discordId = normalizeDiscordId(args.discordId);
    const user = await ctx.db
      .query("users")
      .withIndex("by_discordId", (q) => q.eq("discordId", discordId))
      .unique();

    if (!user) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "This Discord user must sign in before they can be invited",
      });
    }

    if (user.status === "active") {
      throw new ConvexError({
        code: "USER_ALREADY_ACTIVE",
        message: "This user is already active",
      });
    }

    if (user.status !== "pending") {
      throw new ConvexError({
        code: "USER_NOT_INVITABLE",
        message: "Only pending users can be activated from this screen",
      });
    }

    const uploaderLeagueIds = await normalizeLeagueIds(
      ctx,
      args.uploaderLeagueIds,
    );
    const hostLeagueId = await normalizeLeagueIds(ctx, args.hostLeagueId);

    await ctx.db.patch("users", user._id, {
      status: "active",
      roles: normalizeRoles(args.roles, args.makeAdmin),
      uploaderLeagues: uploaderLeagueIds,
      hostLeagueId,
    });

    return user._id;
  },
});

export const updateManagedUser = mutation({
  args: {
    userId: v.id("users"),
    roles: v.array(managedRoleValidator),
    uploaderLeagueIds: v.array(v.id("leagues")),
    hostLeagueId: v.array(v.id("leagues")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const user = await ctx.db.get("users", args.userId);

    if (!user) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "The requested user does not exist",
      });
    }

    if (user.roles.includes("admin")) {
      throw new ConvexError({
        code: "ADMIN_USER_READ_ONLY",
        message: "Admin users are managed through the Convex dashboard",
      });
    }

    if (user.status !== "active") {
      throw new ConvexError({
        code: "USER_NOT_ACTIVE",
        message: "Only active users can be managed from this screen",
      });
    }

    const uploaderLeagues = await normalizeLeagueIds(
      ctx,
      args.uploaderLeagueIds,
    );
    const hostLeagueId = await normalizeLeagueIds(ctx, args.hostLeagueId);

    await ctx.db.patch("users", user._id, {
      roles: normalizeManagedRoles(args.roles),
      uploaderLeagues,
      hostLeagueId,
    });
  },
});

export const updateAllUsers = internalMutation({
  args: {
    users: v.array(
      v.object({
        discordId: v.string(),
        roles: v.array(v.string()),
        uploaderLeagueNumbers: v.optional(v.array(v.number())),
        hostLeagueNumbers: v.optional(v.array(v.number())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const u of args.users) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_discordId", (q) => q.eq("discordId", u.discordId))
        .unique();

      if (!user) {
        console.log(
          `[updateAllUsers] No user found for discordId=${u.discordId}`,
        );
        continue;
      }

      if (user.roles.includes("admin")) {
        throw new ConvexError({
          status: 403,
          error: "Admin users cannot be managed through the API.",
        });
      }

      if (user.status !== "active") {
        throw new ConvexError({
          status: 403,
          error: "Only active users can be managed by the API.",
        });
      }

      const patch: Partial<Doc<"users">> = {
        roles: u.roles as typeof user.roles,
      };

      if (u.uploaderLeagueNumbers !== undefined) {
        patch.uploaderLeagues = await getLeaguesFromNumbers(
          ctx,
          u.uploaderLeagueNumbers,
        );
      }

      if (u.hostLeagueNumbers !== undefined) {
        patch.hostLeagueId = await getLeaguesFromNumbers(
          ctx,
          u.hostLeagueNumbers,
        );
      }

      await ctx.db.patch("users", user._id, patch);
    }

    return { ok: true as const };
  },
});

function normalizeDiscordId(discordId: string) {
  const normalizedDiscordId = discordId.trim();

  if (normalizedDiscordId.length === 0) {
    throw new ConvexError({
      code: "INVALID_DISCORD_ID",
      message: "Enter a Discord user ID",
    });
  }

  if (!/^\d+$/.test(normalizedDiscordId)) {
    throw new ConvexError({
      code: "INVALID_DISCORD_ID",
      message: "Discord user IDs only contain numbers",
    });
  }

  return normalizedDiscordId;
}

async function normalizeLeagueIds(
  ctx: QueryCtx | MutationCtx,
  leagueIds: Id<"leagues">[],
) {
  const uniqueLeagueIds = Array.from(new Set(leagueIds));

  const leagues = await Promise.all(
    uniqueLeagueIds.map((leagueId) => ctx.db.get("leagues", leagueId)),
  );

  if (leagues.some((league) => league === null)) {
    throw new ConvexError({
      code: "LEAGUE_NOT_EXIST",
      message: "The requested league does not exist",
    });
  }

  return uniqueLeagueIds;
}

function normalizeRoles(roles: ManagedRole[], makeAdmin: boolean) {
  const roleSet = new Set<UserRole>(roles);

  if (makeAdmin) {
    roleSet.add("admin");
  }

  return ALL_ROLE_ORDER.filter((role) => roleSet.has(role));
}

function normalizeManagedRoles(roles: ManagedRole[]) {
  const roleSet = new Set(roles);

  return MANAGED_ROLE_ORDER.filter((role) => roleSet.has(role));
}

async function getLeaguesFromNumbers(
  ctx: MutationCtx,
  nums: number[],
): Promise<Id<"leagues">[]> {
  const ids: Id<"leagues">[] = [];
  for (const num of nums) {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_leagueNumber", (q) => q.eq("leagueNumber", num))
      .unique();
    if (league) {
      ids.push(league._id);
      continue;
    }
    console.error(`404: League ${num} not found`);
  }
  return ids;
}
