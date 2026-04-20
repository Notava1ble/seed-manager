import { v, ConvexError } from "convex/values";
import { internalMutation } from "./_generated/server";
import { getSettings, requireSettings, SETTINGS_KEY } from "./lib/settings";
import { MAX_WEEK_EXPIRATION_COUNT } from "./lib/consts";

export const initializeSettings = internalMutation({
  args: {
    currentWeekNumber: v.number(),
    seedTestingPaused: v.boolean(),
  },
  handler: async (ctx, args) => {
    validateWeekNumber(args.currentWeekNumber);

    const existing = await getSettings(ctx);

    if (existing) {
      await ctx.db.patch("settings", existing._id, {
        currentWeekNumber: args.currentWeekNumber,
        seedTestingPaused: args.seedTestingPaused,
      });
      return existing._id;
    }

    return await ctx.db.insert("settings", {
      key: SETTINGS_KEY,
      currentWeekNumber: args.currentWeekNumber,
      seedTestingPaused: args.seedTestingPaused,
    });
  },
});

export const setExpireFalseExistingGoodSeeds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const settings = await requireSettings(ctx);
    const seeds = await ctx.db
      .query("seeds")
      .withIndex("by_rating_and_leagueId", (q) => q.eq("rating", "Good"))
      .take(MAX_WEEK_EXPIRATION_COUNT);

    let expiredCount = 0;

    for (const seed of seeds) {
      if (!seed.leagueId || seed.isExpired === true) {
        continue;
      }

      await ctx.db.patch("seeds", seed._id, {
        assignedWeekNumber: settings.currentWeekNumber,
        isExpired: false,
      });
      expiredCount += 1;
    }

    return { expiredCount };
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
