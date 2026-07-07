import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireActiveUser, requireAdmin } from "./lib/permissions";
import { getSettings, requireSettings } from "./lib/settings";
import { MAX_WEEK_EXPIRATION_COUNT } from "./lib/consts";

export const current = query({
  args: {},
  handler: async (ctx) => {
    await requireActiveUser(ctx);

    return await getSettings(ctx);
  },
});

export const pauseSeedTesting = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const settings = await requireSettings(ctx);

    if (settings.seedTestingPaused) {
      return;
    }

    await ctx.db.patch("settings", settings._id, {
      seedTestingPaused: true,
    });
  },
});

export const resumeSeedTesting = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const settings = await requireSettings(ctx);

    if (!settings.seedTestingPaused) {
      return;
    }

    await ctx.db.patch("settings", settings._id, {
      seedTestingPaused: false,
    });
  },
});

export const advanceWeek = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const settings = await requireSettings(ctx);
    const activeSeeds = await ctx.db
      .query("seeds")
      .withIndex("by_isExpired", (q) => q.eq("isExpired", false))
      .take(MAX_WEEK_EXPIRATION_COUNT);

    // In case there were more seeds, fail instead of partially finishing
    if (activeSeeds.length >= MAX_WEEK_EXPIRATION_COUNT) {
      throw new ConvexError({
        code: "TOO_MANY_ACTIVE_SEEDS",
        message: "Too many active seeds to expire in one week advance",
      });
    }

    const leagues = activeSeeds
      .map((s) => s.leagueId)
      .filter((lid) => lid !== undefined);

    let expiredCount = 0;

    for (const seed of activeSeeds) {
      await ctx.db.patch("seeds", seed._id, {
        isExpired: true,
      });
      expiredCount += 1;
    }

    // Set all league counts to zero because all active seeds expired
    for (const leagueId of leagues) {
      await ctx.db.patch("leagues", leagueId, {
        seedCount: 0,
        usedSeedCount: 0,
      });
    }

    // reset host and uploader roles
    const users = await ctx.db.query("users").collect();

    await Promise.all(
      users.map((u) =>
        ctx.db.patch("users", u._id, {
          hostLeagueId: [],
          uploaderLeagues: [],
        }),
      ),
    );

    await ctx.db.patch("settings", settings._id, {
      currentWeekNumber: settings.currentWeekNumber + 1,
      seedTestingPaused: true,
    });

    return {
      currentWeekNumber: settings.currentWeekNumber + 1,
      expiredCount,
    };
  },
});
