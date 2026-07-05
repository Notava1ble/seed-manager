import { v, ConvexError } from "convex/values";
import { internalMutation } from "./_generated/server";
import { getSettings, requireSettings, SETTINGS_KEY } from "./lib/settings";
import { MAX_WEEK_EXPIRATION_COUNT } from "./lib/consts";

const MAX_AUTH_CLEANUP_BATCH_SIZE = 1000;

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

export const markBtSeeds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allSeeds = await ctx.db.query("seeds").collect();
    await Promise.all(
      allSeeds.map((s) => {
        const isBt = s.type === "BURIED_TREASURE";
        if (isBt)
          return ctx.db.patch("seeds", s._id, {
            isBt: true,
          });

        return ctx.db.patch("seeds", s._id, {
          isBt: false,
        });
      }),
    );
  },
});

export const clearStoredUserEmails = internalMutation({
  args: {},
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .withIndex("email")
      .take(MAX_AUTH_CLEANUP_BATCH_SIZE);

    let clearedCount = 0;

    for (const user of users) {
      if (user.email === undefined) {
        continue;
      }

      await ctx.db.patch("users", user._id, {
        email: undefined,
      });
      clearedCount += 1;
    }

    return {
      clearedCount,
    };
  },
});

export const deleteGithubUsersAndSessions = internalMutation({
  args: {},
  handler: async (ctx, args) => {
    const githubAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) => q.eq("provider", "github"))
      .take(MAX_AUTH_CLEANUP_BATCH_SIZE);
    const userIds = Array.from(
      new Set(githubAccounts.map((account) => account.userId)),
    );

    let deletedUserCount = 0;
    let deletedAccountCount = 0;
    let deletedSessionCount = 0;
    let deletedRefreshTokenCount = 0;
    let deletedVerificationCodeCount = 0;

    for (const userId of userIds) {
      const accounts = await ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
        .take(MAX_AUTH_CLEANUP_BATCH_SIZE);

      for (const account of accounts) {
        const verificationCodes = await ctx.db
          .query("authVerificationCodes")
          .withIndex("accountId", (q) => q.eq("accountId", account._id))
          .take(MAX_AUTH_CLEANUP_BATCH_SIZE);

        for (const verificationCode of verificationCodes) {
          await ctx.db.delete("authVerificationCodes", verificationCode._id);
          deletedVerificationCodeCount += 1;
        }

        await ctx.db.delete("authAccounts", account._id);
        deletedAccountCount += 1;
      }

      const sessions = await ctx.db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .take(MAX_AUTH_CLEANUP_BATCH_SIZE);

      for (const session of sessions) {
        const refreshTokens = await ctx.db
          .query("authRefreshTokens")
          .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
          .take(MAX_AUTH_CLEANUP_BATCH_SIZE);

        for (const refreshToken of refreshTokens) {
          await ctx.db.delete("authRefreshTokens", refreshToken._id);
          deletedRefreshTokenCount += 1;
        }

        await ctx.db.delete("authSessions", session._id);
        deletedSessionCount += 1;
      }

      const user = await ctx.db.get(userId);
      if (user) {
        await ctx.db.delete("users", user._id);
        deletedUserCount += 1;
      }
    }

    return {
      deletedUserCount,
      deletedAccountCount,
      deletedSessionCount,
      deletedRefreshTokenCount,
      deletedVerificationCodeCount,
    };
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
