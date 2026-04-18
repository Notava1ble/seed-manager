import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getUser, requireAdmin } from "./lib/permissions";

const MAX_ACTIVE_USER_LIST_COUNT = 1000;

const managedRoleValidator = v.union(v.literal("host"), v.literal("tester"));
const ALL_ROLE_ORDER = ["admin", "host", "tester"] as const;
const MANAGED_ROLE_ORDER = ["host", "tester"] as const;

type UserRole = (typeof ALL_ROLE_ORDER)[number];
type ManagedRole = (typeof MANAGED_ROLE_ORDER)[number];

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getUser(ctx);
  },
});

export const listActiveUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db
      .query("users")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(MAX_ACTIVE_USER_LIST_COUNT);

    return users;
  },
});

export const activateUserByGithubUsername = mutation({
  args: {
    username: v.string(),
    roles: v.array(managedRoleValidator),
    makeAdmin: v.boolean(),
    homeLeagueId: v.optional(v.id("leagues")),
    hostLeagueId: v.optional(v.id("leagues")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const lowercaseName = normalizeGithubUsername(args.username);
    const user = await ctx.db
      .query("users")
      .withIndex("lowercase_name", (q) => q.eq("lowercaseName", lowercaseName))
      .unique();

    if (!user) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "This GitHub user must sign in before they can be invited",
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

    await assertLeagueExists(ctx, args.homeLeagueId);
    await assertLeagueExists(ctx, args.hostLeagueId);

    await ctx.db.patch("users", user._id, {
      status: "active",
      roles: normalizeRoles(args.roles, args.makeAdmin),
      homeLeagueId: args.homeLeagueId,
      hostLeagueId: args.hostLeagueId,
    });

    return user._id;
  },
});

export const updateManagedUser = mutation({
  args: {
    userId: v.id("users"),
    roles: v.array(managedRoleValidator),
    homeLeagueId: v.optional(v.id("leagues")),
    hostLeagueId: v.optional(v.id("leagues")),
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

    await assertLeagueExists(ctx, args.homeLeagueId);
    await assertLeagueExists(ctx, args.hostLeagueId);

    await ctx.db.patch("users", user._id, {
      roles: normalizeManagedRoles(args.roles),
      homeLeagueId: args.homeLeagueId,
      hostLeagueId: args.hostLeagueId,
    });
  },
});

function normalizeGithubUsername(username: string) {
  const lowercaseName = username.trim().toLowerCase();

  if (lowercaseName.length === 0) {
    throw new ConvexError({
      code: "INVALID_USERNAME",
      message: "Enter a GitHub username",
    });
  }

  return lowercaseName;
}

async function assertLeagueExists(
  ctx: QueryCtx | MutationCtx,
  leagueId: Id<"leagues"> | undefined,
) {
  if (leagueId === undefined) {
    return;
  }

  const league = await ctx.db.get("leagues", leagueId);

  if (!league) {
    throw new ConvexError({
      code: "LEAGUE_NOT_EXIST",
      message: "The requested league does not exist",
    });
  }
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
