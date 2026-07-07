import { v, ConvexError } from "convex/values";
import { internalMutation } from "./_generated/server";
import { getSettings, SETTINGS_KEY } from "./lib/settings";

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

function validateWeekNumber(weekNumber: number) {
  if (!Number.isSafeInteger(weekNumber) || weekNumber < 1) {
    throw new ConvexError({
      code: "INVALID_WEEK_NUMBER",
      message: "Week number must be a positive whole number",
    });
  }
}
