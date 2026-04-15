import { ConvexError, GenericId, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  canViewLeague,
  requireActiveUser,
  requireAdmin,
} from "./lib/permissions";

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
