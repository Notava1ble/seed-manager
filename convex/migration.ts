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

export const clearUnusedFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allSeeds = await ctx.db.query("seeds").collect();

    await Promise.all(
      allSeeds.map((s) => {
        if (s.isExpired === undefined) {
          return ctx.db.delete("seeds", s._id);
        }
        return ctx.db.patch("seeds", s._id, {
          ...s,
          claimedBy: undefined,
          directUploaderAssignmentBy: undefined,
          uploadedByUploaderId: undefined,
        });
      }),
    );
  },
});

export const removeTesterRoles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();

    await Promise.all(
      allUsers.map((u) => {
        return ctx.db.patch("users", u._id, {
          ...u,
          roles: u.roles.filter((r) => r !== "tester"),
          homeLeagueId: undefined,
        });
      }),
    );
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
