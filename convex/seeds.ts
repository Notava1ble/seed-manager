import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  canViewLeague,
  requireActiveUser,
  requireAdmin,
} from "./lib/permissions";

const MAX_LEAGUE_SEED_LIST_COUNT = 500;
const MAX_ADMIN_SEED_LIST_COUNT = 1000;
const MAX_SEED_IMPORT_COUNT = 500;
const NUMERIC_SEED_PATTERN = /^[0-9]+$/;

const seedTypeValidator = v.union(
  v.literal("BURIED_TREASURE"),
  v.literal("VILLAGE"),
  v.literal("DESERT_TEMPLE"),
  v.literal("RUINED_PORTAL"),
  v.literal("SHIPWRECK"),
);

const seedUploadValidator = v.object({
  leagueId: v.optional(v.id("leagues")),
  overworld: v.string(),
  nether: v.string(),
  end: v.string(),
  rng: v.string(),
  type: seedTypeValidator,
});

const seedRatingValidator = v.union(v.literal("Good"), v.literal("Bad"));

type SeedUploadInput = {
  leagueId?: Id<"leagues">;
  overworld: string;
  nether: string;
  end: string;
  rng: string;
  type:
    | "BURIED_TREASURE"
    | "VILLAGE"
    | "DESERT_TEMPLE"
    | "RUINED_PORTAL"
    | "SHIPWRECK";
};

export const listAllSeeds = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    return await ctx.db
      .query("seeds")
      .order("desc")
      .take(MAX_ADMIN_SEED_LIST_COUNT);
  },
});

export const listSeedsByLeague = query({
  args: {
    leagueId: v.id("leagues"),
    showAllAssigned: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const league = await ctx.db.get("leagues", args.leagueId);

    if (!league || !canViewLeague(user, league)) {
      return [];
    }

    if (args.showAllAssigned) {
      return await ctx.db
        .query("seeds")
        .withIndex("by_leagueId", (q) => q.eq("leagueId", args.leagueId))
        .take(MAX_LEAGUE_SEED_LIST_COUNT);
    }

    return await ctx.db
      .query("seeds")
      .withIndex("by_leagueId_and_rating_and_isUsed", (q) =>
        q
          .eq("leagueId", args.leagueId)
          .eq("rating", "Good")
          .eq("isUsed", false),
      )
      .take(MAX_LEAGUE_SEED_LIST_COUNT);
  },
});

export const getSeedForLeague = query({
  args: {
    leagueId: v.id("leagues"),
    seedId: v.id("seeds"),
  },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const seed = await ctx.db.get("seeds", args.seedId);

    if (!seed) {
      return null;
    }
    if (seed.leagueId !== args.leagueId) {
      return null;
    }

    const league = await ctx.db.get("leagues", seed.leagueId);

    if (!league || !canViewLeague(user, league)) {
      return null;
    }

    return seed;
  },
});

export const getCurrentClaimedSeed = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActiveUser(ctx);

    if (!user.roles.includes("tester")) {
      return null;
    }

    return await ctx.db
      .query("seeds")
      .withIndex("by_claimedBy_and_rating", (q) =>
        q.eq("claimedBy", user._id).eq("rating", undefined),
      )
      .first();
  },
});

export const claimSeed = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireActiveUser(ctx);

    if (!user.roles.includes("tester")) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Tester access required",
      });
    }

    const currentClaim = await ctx.db
      .query("seeds")
      .withIndex("by_claimedBy_and_rating", (q) =>
        q.eq("claimedBy", user._id).eq("rating", undefined),
      )
      .first();

    if (currentClaim) {
      throw new ConvexError({
        code: "SEED_ALREADY_CLAIMED",
        message: "Finish your claimed seed before claiming another one",
      });
    }

    const seed = await ctx.db
      .query("seeds")
      .withIndex("by_leagueId_and_claimedBy_and_rating_and_isUsed", (q) =>
        q
          .eq("leagueId", undefined)
          .eq("claimedBy", undefined)
          .eq("rating", undefined)
          .eq("isUsed", false),
      )
      .first();

    if (!seed) {
      throw new ConvexError({
        code: "NO_SEEDS_AVAILABLE",
        message: "There are no unassigned seeds available to claim",
      });
    }

    await ctx.db.patch("seeds", seed._id, {
      claimedBy: user._id,
    });

    return seed._id;
  },
});

export const vouchSeed = mutation({
  args: {
    seedId: v.id("seeds"),
    rating: seedRatingValidator,
    leagueId: v.optional(v.id("leagues")),
  },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const seed = await ctx.db.get("seeds", args.seedId);

    if (!seed) {
      throw new ConvexError({
        code: "SEED_NOT_FOUND",
        message: "The requested seed does not exist",
      });
    }

    if (seed.claimedBy !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the tester who claimed this seed can vouch it",
      });
    }

    if (seed.isUsed) {
      throw new ConvexError({
        code: "SEED_ALREADY_USED",
        message: "Used seeds cannot be vouched",
      });
    }

    if (args.rating === "Bad") {
      if (args.leagueId !== undefined) {
        throw new ConvexError({
          code: "BAD_SEED_WITH_LEAGUE",
          message: "Bad seeds should not receive a league assignment",
        });
      }

      await ctx.db.patch("seeds", seed._id, {
        rating: args.rating,
      });
      return;
    }

    const leagueId = seed.leagueId ?? args.leagueId;

    if (!leagueId) {
      throw new ConvexError({
        code: "LEAGUE_REQUIRED",
        message: "Good seeds must be assigned to a league",
      });
    }

    if (seed.leagueId !== undefined && args.leagueId !== undefined) {
      if (seed.leagueId !== args.leagueId) {
        throw new ConvexError({
          code: "LEAGUE_LOCKED",
          message: "Only admins can change an assigned seed's league",
        });
      }
    }

    const league = await ctx.db.get("leagues", leagueId);

    if (!league) {
      throw new ConvexError({
        code: "LEAGUE_NOT_EXIST",
        message: "The requested league id does not exist",
      });
    }

    if (!canViewLeague(user, league)) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You cannot assign seeds to this league",
      });
    }

    const isNewLeagueAssignment = seed.leagueId === undefined;

    await ctx.db.patch("seeds", seed._id, {
      rating: args.rating,
      leagueId,
    });

    if (isNewLeagueAssignment) {
      await ctx.db.patch("leagues", leagueId, {
        seedCount: league.seedCount + 1,
      });
    }
  },
});

export const updateSeedRating = mutation({
  args: {
    seedId: v.id("seeds"),
    rating: seedRatingValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const seed = await ctx.db.get("seeds", args.seedId);

    if (!seed) {
      throw new ConvexError({
        code: "SEED_NOT_FOUND",
        message: "The requested seed does not exist",
      });
    }

    const canRateAsAdmin = user.roles.includes("admin");
    const canRateAsOriginalTester = seed.claimedBy === user._id;
    const canRateAsHost =
      seed.leagueId !== undefined &&
      user.roles.includes("host") &&
      seed.leagueId === user.hostLeagueId;

    if (!canRateAsAdmin && !canRateAsOriginalTester && !canRateAsHost) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You cannot change this seed's rating",
      });
    }

    if (args.rating === "Good" && seed.leagueId === undefined) {
      throw new ConvexError({
        code: "LEAGUE_REQUIRED",
        message: "Good seeds must be assigned to a league",
      });
    }

    await ctx.db.patch("seeds", seed._id, {
      rating: args.rating,
    });
  },
});

export const markSeedUsed = mutation({
  args: {
    seedId: v.id("seeds"),
  },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const seed = await ctx.db.get("seeds", args.seedId);

    if (!seed) {
      throw new ConvexError({
        code: "SEED_NOT_FOUND",
        message: "The requested seed does not exist",
      });
    }

    if (seed.leagueId === undefined) {
      throw new ConvexError({
        code: "SEED_UNASSIGNED",
        message: "Only assigned seeds can be marked used",
      });
    }

    const league = await ctx.db.get("leagues", seed.leagueId);

    if (!league) {
      throw new ConvexError({
        code: "LEAGUE_NOT_EXIST",
        message: "The seed's league does not exist",
      });
    }

    const canMarkAsAdmin = user.roles.includes("admin");
    const canMarkAsHost =
      user.roles.includes("host") && seed.leagueId === user.hostLeagueId;

    if (!canMarkAsAdmin && !canMarkAsHost) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only admins and hosts for this league can mark this seed used",
      });
    }

    if (seed.isUsed) {
      return;
    }

    await ctx.db.patch("seeds", seed._id, {
      isUsed: true,
      usedAt: Date.now(),
      usedBy: user._id,
    });

    await ctx.db.patch("leagues", league._id, {
      usedSeedCount: league.usedSeedCount + 1,
    });
  },
});

export const importSeeds = mutation({
  args: {
    seeds: v.array(seedUploadValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const normalizedSeeds = await normalizeSeeds(ctx, args.seeds);
    const uniqueSeeds = new Map<string, SeedUploadInput>();
    const leagueSeedCounts = new Map<Id<"leagues">, number>();

    let insertedCount = 0;
    let skipCount = 0;

    for (const seed of normalizedSeeds) {
      if (uniqueSeeds.has(seed.overworld)) {
        skipCount += 1;
        continue;
      }

      uniqueSeeds.set(seed.overworld, seed);
    }

    for (const seed of uniqueSeeds.values()) {
      const existing = await ctx.db
        .query("seeds")
        .withIndex("by_owseed", (q) => q.eq("overworld", seed.overworld))
        .unique();

      if (existing) {
        skipCount += 1;
        continue;
      }

      await ctx.db.insert("seeds", {
        overworld: seed.overworld,
        nether: seed.nether,
        end: seed.end,
        rng: seed.rng,
        type: seed.type,
        ...(seed.leagueId
          ? { leagueId: seed.leagueId, rating: "Good" as const }
          : {}),
        addedBy: user._id,
        isUsed: false,
        commentCount: 0,
      });
      insertedCount += 1;

      if (seed.leagueId) {
        leagueSeedCounts.set(
          seed.leagueId,
          (leagueSeedCounts.get(seed.leagueId) ?? 0) + 1,
        );
      }
    }

    for (const [leagueId, seedCount] of leagueSeedCounts) {
      const league = await ctx.db.get("leagues", leagueId);

      if (!league) {
        throw new ConvexError({
          code: "LEAGUE_NOT_EXIST",
          message: "The requested league id does not exist",
        });
      }

      await ctx.db.patch("leagues", leagueId, {
        seedCount: league.seedCount + seedCount,
      });
    }

    return { insertedCount, skipCount };
  },
});

async function normalizeSeeds(ctx: MutationCtx, seeds: SeedUploadInput[]) {
  if (seeds.length === 0) {
    throw new ConvexError({
      code: "EMPTY_SEED_IMPORT",
      message: "Import at least one seed",
    });
  }

  if (seeds.length > MAX_SEED_IMPORT_COUNT) {
    throw new ConvexError({
      code: "SEED_IMPORT_LIMIT_EXCEEDED",
      message: `Import up to ${MAX_SEED_IMPORT_COUNT} seeds at a time`,
    });
  }

  const uniqueLeagueIds = new Set<Id<"leagues">>();
  const normalizedSeeds = seeds.map((s) => ({
    ...s,
    overworld: validateNumericSeedString(s.overworld, "Overworld seed"),
    nether: validateNumericSeedString(s.nether, "Nether seed"),
    end: validateNumericSeedString(s.end, "End seed"),
    rng: validateNumericSeedString(s.rng, "RNG seed"),
  }));

  for (const seed of normalizedSeeds) {
    if (seed.leagueId) {
      uniqueLeagueIds.add(seed.leagueId);
    }
  }

  const leagues = await Promise.all(
    Array.from(uniqueLeagueIds).map((l) => ctx.db.get("leagues", l)),
  );
  if (leagues.length !== uniqueLeagueIds.size) {
    throw new ConvexError({
      code: "LEAGUE_NOT_EXIST",
      message: "The requested league id does not exist",
    });
  }

  return normalizedSeeds;
}

function validateNumericSeedString(value: string, label: string) {
  const trimmedValue = value.trim();

  if (!NUMERIC_SEED_PATTERN.test(trimmedValue)) {
    throw new ConvexError({
      code: "INVALID_SEED_VALUE",
      message: `${label} must contain only numbers`,
    });
  }

  return trimmedValue;
}
