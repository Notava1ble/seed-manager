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

function validateLeagueFields({
  leagueNumber,
  leagueName,
}: {
  leagueNumber: number;
  leagueName: string;
}) {
  if (!Number.isSafeInteger(leagueNumber) || leagueNumber < 1) {
    throw new ConvexError({
      code: "INVALID_LEAGUE_NUMBER",
      message: "League number must be a positive whole number",
    });
  }

  const trimmedLeagueName = leagueName.trim();

  if (
    trimmedLeagueName.length < MIN_LEAGUE_NAME_LENGTH ||
    trimmedLeagueName.length > MAX_LEAGUE_NAME_LENGTH
  ) {
    throw new ConvexError({
      code: "INVALID_LEAGUE_NAME",
      message: "League name must be between 3 and 20 characters",
    });
  }

  return trimmedLeagueName;
}

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

    const leagueName = validateLeagueFields(args);

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

export const updateLeague = mutation({
  args: {
    leagueId: v.id("leagues"),
    leagueNumber: v.number(),
    leagueName: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const league = await ctx.db.get("leagues", args.leagueId);

    if (!league) {
      throw new ConvexError({
        code: "LEAGUE_NOT_EXIST",
        message: "The requested league id does not exist",
      });
    }

    const leagueName = validateLeagueFields(args);

    if (league.leagueNumber !== args.leagueNumber) {
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
    }

    await ctx.db.patch("leagues", args.leagueId, {
      leagueNumber: args.leagueNumber,
      leagueName,
    });
  },
});

export const deleteLeague = mutation({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const league = await ctx.db.get("leagues", args.leagueId);

    if (!league) {
      throw new ConvexError({
        code: "LEAGUE_NOT_EXIST",
        message: "The requested league id does not exist",
      });
    }

    await ctx.db.delete("leagues", league._id);

    const connectedSeeds = await ctx.db
      .query("seeds")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
      .collect();

    await Promise.all(
      connectedSeeds.map((seed) =>
        ctx.db.patch(seed._id, {
          leagueId: undefined,
        }),
      ),
    );
  },
});
