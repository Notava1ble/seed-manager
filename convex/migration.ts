import { v, ConvexError } from "convex/values";
import { internalMutation } from "./_generated/server";
import { getSettings, SETTINGS_KEY } from "./lib/settings";

export const initializeSettings = internalMutation({
  args: {
    currentWeekNumber: v.number(),
    seedTestingPaused: v.boolean(),
    enableJunglePyramidSeeds: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    validateWeekNumber(args.currentWeekNumber);

    const existing = await getSettings(ctx);

    if (existing) {
      await ctx.db.patch("settings", existing._id, {
        currentWeekNumber: args.currentWeekNumber,
        seedTestingPaused: args.seedTestingPaused,
        enableJunglePyramidSeeds:
          args.enableJunglePyramidSeeds ??
          existing.enableJunglePyramidSeeds ??
          false,
      });
      return existing._id;
    }

    return await ctx.db.insert("settings", {
      key: SETTINGS_KEY,
      currentWeekNumber: args.currentWeekNumber,
      seedTestingPaused: args.seedTestingPaused,
      enableJunglePyramidSeeds: args.enableJunglePyramidSeeds ?? false,
    });
  },
});

export const numberSeeds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allLeagues = await ctx.db.query("leagues").collect();

    for (const league of allLeagues) {
      const seedsForLeague = await ctx.db
        .query("seeds")
        .withIndex("by_leagueId_and_isExpired", (q) =>
          q.eq("leagueId", league._id).eq("isExpired", false),
        )
        .collect();

      await Promise.all(
        seedsForLeague.map((s, i) =>
          ctx.db.patch("seeds", s._id, { seedNumber: i + 1 }),
        ),
      );
    }
  },
});

export const removeSeedRatings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const seeds = await ctx.db.query("seeds").collect();
    let deletedComments = 0;
    let deletedSeeds = 0;
    let updatedSeeds = 0;

    for (const seed of seeds) {
      if (seed.rating === "Bad") {
        for await (const comment of ctx.db
          .query("comments")
          .withIndex("by_seedId_and_createdAt", (q) =>
            q.eq("seedId", seed._id),
          )) {
          await ctx.db.delete("comments", comment._id);
          deletedComments += 1;
        }

        await ctx.db.delete("seeds", seed._id);
        deletedSeeds += 1;
        continue;
      }

      if (
        seed.rating !== undefined ||
        seed.votedAt !== undefined ||
        seed.votedBy !== undefined
      ) {
        await ctx.db.patch("seeds", seed._id, {
          rating: undefined,
          votedAt: undefined,
          votedBy: undefined,
        });
        updatedSeeds += 1;
      }
    }

    return { deletedComments, deletedSeeds, updatedSeeds };
  },
});

function validateWeekNumber(weekNumber: number) {
  if (!Number.isSafeInteger(weekNumber) || weekNumber < 1) {
    throw new ConvexError({
      code: "INVALID_WEEK_NUMBER",
      message: "Week number must be a positive whole number",
    });
  }
}
