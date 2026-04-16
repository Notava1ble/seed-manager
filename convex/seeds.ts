import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  canViewLeague,
  requireActiveUser,
  requireAdmin,
} from "./lib/permissions";

const MAX_LEAGUE_SEED_LIST_COUNT = 500;
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

    const allSeeds = ctx.db.query("seeds").collect();
    return allSeeds;
  },
});

export const listSeedsByLeague = query({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const league = await ctx.db.get("leagues", args.leagueId);

    if (!league || !canViewLeague(user, league)) {
      return [];
    }

    return await ctx.db
      .query("seeds")
      .withIndex("by_leagueId_and_isUsed", (q) =>
        q.eq("leagueId", args.leagueId).eq("isUsed", false),
      )
      .take(MAX_LEAGUE_SEED_LIST_COUNT);
  },
});

export const getSeedForLeague = query({
  args: {
    seedId: v.id("seeds"),
  },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const seed = await ctx.db.get("seeds", args.seedId);

    if (!seed) {
      return null;
    }
    if (seed.leagueId === undefined) {
      if (!canViewLeague(user, undefined)) {
        return null;
      }
      return seed;
    }

    const league = await ctx.db.get("leagues", seed.leagueId);

    if (!league || !canViewLeague(user, league)) {
      return null;
    }

    return seed;
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
        ...seed,
        addedBy: user._id,
        isUsed: false,
        usedAt: 0,
        usedBy: user._id,
        upvoteCount: 0,
        downvoteCount: 0,
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
