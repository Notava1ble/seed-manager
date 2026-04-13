import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { getUser } from "./users";
import type { Doc } from "./_generated/dataModel";

const MIN_LEAGUE_NAME_LENGTH = 3;
const MAX_LEAGUE_NAME_LENGTH = 20;

export function canViewLeague(user: Doc<"users">, league: Doc<"leagues">) {
  const leagueId = league._id;

  if (user.roles.includes("admin")) {
    return true;
  }

  const hasTesterAccess =
    user.roles.includes("tester") && leagueId !== user.homeLeagueId;

  const hasHostAccess =
    user.roles.includes("host") && leagueId === user.hostLeagueId;

  return hasTesterAccess || hasHostAccess;
}

async function requireActiveUser(ctx: QueryCtx | MutationCtx) {
  const user = await getUser(ctx);
  if (!user) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Sign in required",
    });
  }

  if (user.status !== "active") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You do not have access to this data",
    });
  }

  return user;
}

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireActiveUser(ctx);

  if (!user.roles.includes("admin")) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return user;
}

export const listLeagues = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActiveUser(ctx);

    const leagues = await ctx.db.query("leagues").collect();

    return leagues.filter((l) => canViewLeague(user, l));
  },
});

export const addLeague = mutation({
  args: {
    leagueNumber: v.number(),
    leagueName: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (!Number.isSafeInteger(args.leagueNumber) || args.leagueNumber < 1) {
      throw new ConvexError({
        code: "INVALID_LEAGUE_NUMBER",
        message: "League number must be a positive whole number",
      });
    }

    const leagueName = args.leagueName.trim();

    if (
      leagueName.length < MIN_LEAGUE_NAME_LENGTH ||
      leagueName.length > MAX_LEAGUE_NAME_LENGTH
    ) {
      throw new ConvexError({
        code: "INVALID_LEAGUE_NAME",
        message: "League name must be between 3 and 20 characters",
      });
    }

    const existingLeague = await ctx.db
      .query("leagues")
      .withIndex("by_leagueNumber", (q) =>
        q.eq("leagueNumber", args.leagueNumber),
      )
      .unique();

    if (existingLeague) {
      throw new ConvexError({
        code: "DUPLICATE_LEAGUE_NUMBER",
        message: "A league with this number already exists",
      });
    }

    return await ctx.db.insert("leagues", {
      seedCount: 0,
      usedSeedCount: 0,
      leagueNumber: args.leagueNumber,
      leagueName,
    });
  },
});
