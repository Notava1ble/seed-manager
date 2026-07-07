import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  canViewLeague,
  requireActiveUser,
  requireAdmin,
} from "./lib/permissions";
import { requireSettings } from "./lib/settings";
import {
  MAX_ADMIN_SEED_LIST_COUNT,
  MAX_LEAGUE_SEED_LIST_COUNT,
  NUMERIC_SEED_PATTERN,
} from "./lib/consts";

const ALL_SEED_TYPES = [
  "BURIED_TREASURE",
  "VILLAGE",
  "DESERT_TEMPLE",
  "RUINED_PORTAL",
  "SHIPWRECK",
] as const;

type SeedType = (typeof ALL_SEED_TYPES)[number];

const seedTypeValidator = v.union(
  v.literal("BURIED_TREASURE"),
  v.literal("VILLAGE"),
  v.literal("DESERT_TEMPLE"),
  v.literal("RUINED_PORTAL"),
  v.literal("SHIPWRECK"),
);

const seedUploadValidator = v.object({
  leagueId: v.id("leagues"),
  overworld: v.string(),
  nether: v.string(),
  end: v.string(),
  rng: v.string(),
  type: seedTypeValidator,
});

const seedRatingValidator = v.union(v.literal("Good"), v.literal("Bad"));

type SeedUploadInput = {
  leagueId: Id<"leagues">;
  overworld: string;
  nether: string;
  end: string;
  rng: string;
  type: SeedType;
};

export const listAllSeeds = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const neverAssignedSeeds = await ctx.db
      .query("seeds")
      .withIndex("by_isExpired", (q) => q.eq("isExpired", undefined))
      .order("desc")
      .take(MAX_ADMIN_SEED_LIST_COUNT);
    const activeAssignedSeeds = await ctx.db
      .query("seeds")
      .withIndex("by_isExpired", (q) => q.eq("isExpired", false))
      .order("desc")
      .take(MAX_ADMIN_SEED_LIST_COUNT);

    return [...neverAssignedSeeds, ...activeAssignedSeeds]
      .filter((seed) => seed.rating !== "Bad")
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, MAX_ADMIN_SEED_LIST_COUNT);
  },
});

export const listBadSeeds = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const badSeeds = await ctx.db
      .query("seeds")
      .withIndex("by_rating", (q) => q.eq("rating", "Bad"))
      .take(MAX_ADMIN_SEED_LIST_COUNT);
    const voterIds = Array.from(
      new Set(
        badSeeds
          .map((seed) => seed.votedBy)
          .filter((userId): userId is Id<"users"> => userId !== undefined),
      ),
    );
    const voters = await Promise.all(
      voterIds.map((userId) => ctx.db.get("users", userId)),
    );
    const votersById = new Map(
      voters
        .filter((user) => user !== null)
        .map((user) => [
          user._id,
          {
            _id: user._id,
            name: user.name,
            discordId: user.discordId,
          },
        ]),
    );

    return badSeeds.map((seed) => ({
      ...seed,
      votedByUser: seed.votedBy ? votersById.get(seed.votedBy) : undefined,
    }));
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
      .withIndex("by_leagueId_and_isExpired", (q) =>
        q.eq("leagueId", args.leagueId).eq("isExpired", false),
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
    if (seed.isExpired === true) {
      return null;
    }

    const league = await ctx.db.get("leagues", seed.leagueId);

    if (!league || !canViewLeague(user, league)) {
      return null;
    }

    if (!user.roles.includes("admin")) {
      return {
        ...seed,
        addedByUser: null,
      };
    }

    // Hard set for specific id because of accidental user delelion
    const addedBy = await ctx.db.get("users", seed.addedBy);

    return {
      ...seed,
      addedByUser: addedBy
        ? {
            _id: addedBy._id,
            name: addedBy.name,
            uploaderLeagueIds: addedBy.uploaderLeagues ?? [],
            hostLeagueIds: addedBy.hostLeagueId ?? [],
          }
        : null,
    };
  },
});

// Should probably replace with changeRatingToBad because we now dont allow changing bad to good
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

    if (seed.isExpired === true) {
      throw new ConvexError({
        code: "SEED_EXPIRED",
        message: "Expired seeds are read-only",
      });
    }

    if (seed.isUsed) {
      throw new ConvexError({
        code: "SEED_ALREADY_USED",
        message: "Used seeds are read-only",
      });
    }

    if (seed.rating === "Bad") {
      throw new ConvexError({
        code: "BAD_SEED_FINAL",
        message: "Bad seeds cannot be marked good again",
      });
    }

    if (args.rating === "Good") {
      if (seed.rating === "Good") {
        return;
      }

      throw new ConvexError({
        code: "BAD_SEED_FINAL",
        message: "Bad seeds cannot be marked good again",
      });
    }

    if (seed.rating !== "Good") {
      throw new ConvexError({
        code: "INVALID_RATING_CHANGE",
        message: "Only good seeds can be marked bad",
      });
    }

    await requireSeedTestingOpen(ctx);

    const canRateAsAdmin = user.roles.includes("admin");
    const canRateAsOriginalUploader = seed.addedBy === user._id;
    const canRateAsHost =
      seed.leagueId !== undefined &&
      user.roles.includes("host") &&
      (user.hostLeagueId ?? []).includes(seed.leagueId);

    if (!canRateAsAdmin && !canRateAsOriginalUploader && !canRateAsHost) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You cannot change this seed's rating",
      });
    }

    if (seed.leagueId === undefined) {
      throw new ConvexError({
        code: "SEED_UNASSIGNED",
        message: "Only assigned seeds can be marked bad",
      });
    }
    const league = await ctx.db.get("leagues", seed.leagueId);

    await ctx.db.patch("seeds", seed._id, {
      rating: args.rating,
      leagueId: undefined,
      isExpired: undefined,
      assignedWeekNumber: undefined,
      votedAt: Date.now(),
      votedBy: user._id,
    });

    if (league) {
      await ctx.db.patch("leagues", seed.leagueId, {
        seedCount: league.seedCount - 1,
      });
    }
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

    if (seed.isExpired === true) {
      throw new ConvexError({
        code: "SEED_EXPIRED",
        message: "Expired seeds are read-only",
      });
    }

    if (seed.leagueId === undefined) {
      throw new ConvexError({
        code: "SEED_UNASSIGNED",
        message: "Only assigned seeds can be marked used",
      });
    }

    if (seed.rating !== "Good") {
      throw new ConvexError({
        code: "SEED_NOT_GOOD",
        message: "Only good seeds can be marked used",
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
      user.roles.includes("host") &&
      (user.hostLeagueId ?? []).includes(seed.leagueId);

    if (!canMarkAsAdmin && !canMarkAsHost) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message:
          "Only admins and hosts for this league can mark this seed used",
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

export const changeSeedLeague = mutation({
  args: {
    seedId: v.id("seeds"),
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
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
        message: "Only assigned seeds can move to another league",
      });
    }

    if (seed.isExpired === true) {
      throw new ConvexError({
        code: "SEED_EXPIRED",
        message: "Expired seeds are read-only",
      });
    }

    if (seed.isUsed) {
      throw new ConvexError({
        code: "SEED_ALREADY_USED",
        message: "Used seeds are read-only",
      });
    }

    if (seed.rating !== "Good") {
      throw new ConvexError({
        code: "SEED_NOT_GOOD",
        message: "Only good assigned seeds can move to another league",
      });
    }

    if (seed.leagueId === args.leagueId) {
      return;
    }

    const [sourceLeague, targetLeague] = await Promise.all([
      ctx.db.get("leagues", seed.leagueId),
      ctx.db.get("leagues", args.leagueId),
    ]);

    if (!targetLeague) {
      throw new ConvexError({
        code: "LEAGUE_NOT_EXIST",
        message: "The requested league id does not exist",
      });
    }

    await ctx.db.patch("seeds", seed._id, {
      leagueId: targetLeague._id,
      leagueChangedByAdminId: admin._id,
    });

    if (sourceLeague) {
      await ctx.db.patch("leagues", sourceLeague._id, {
        seedCount: Math.max(0, sourceLeague.seedCount - 1),
      });
    }

    await ctx.db.patch("leagues", targetLeague._id, {
      seedCount: targetLeague.seedCount + 1,
    });
  },
});

export const importSeeds = mutation({
  args: {
    seed: seedUploadValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);

    const isAdmin = user.roles.includes("admin");
    const isUploader = user.roles.includes("uploader");
    if (!isAdmin) {
      const hostLeagues = user.hostLeagueId ?? [];
      const uploaderLeagues = user.uploaderLeagues ?? [];

      if (!isUploader && !user.roles.includes("host")) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "Only admins, hosts, and uploaders can import seeds",
        });
      }

      const canUploadAsUploader = uploaderLeagues.includes(args.seed.leagueId);
      const canUploadAsHost = hostLeagues.includes(args.seed.leagueId);
      if (!canUploadAsUploader && !canUploadAsHost) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message:
            "You can only upload seeds for leagues you are an uploader for and for the leagues you host.",
        });
      }

      await requireSeedTestingOpen(ctx);
    }

    const seed = await normalizeSeed(ctx, args.seed);
    const settings = await requireSettings(ctx);

    const existing = await ctx.db
      .query("seeds")
      .withIndex("by_owseed", (q) => q.eq("overworld", seed.overworld))
      .unique();

    if (existing) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Seed already exists.",
      });
    }

    await ctx.db.insert("seeds", {
      overworld: seed.overworld,
      nether: seed.nether,
      end: seed.end,
      rng: seed.rng,
      type: seed.type,
      isBt: seed.type === "BURIED_TREASURE",

      leagueId: seed.leagueId,
      rating: "Good" as const,
      isExpired: false,
      assignedWeekNumber: settings?.currentWeekNumber,

      addedBy: user._id,
      isUsed: false,
      commentCount: 0,
    });

    const league = await ctx.db.get("leagues", seed.leagueId);

    if (!league) {
      throw new ConvexError({
        code: "LEAGUE_NOT_EXIST",
        message: "The requested league id does not exist",
      });
    }

    await ctx.db.patch("leagues", seed.leagueId, {
      seedCount: league.seedCount + 1,
    });
  },
});

async function normalizeSeed(ctx: MutationCtx, seeds: SeedUploadInput) {
  const normalizedSeed = {
    leagueId: seeds.leagueId,
    type: seeds.type,
    overworld: validateNumericSeedString(seeds.overworld, "Overworld seed"),
    nether: validateNumericSeedString(seeds.nether, "Nether seed"),
    end: validateNumericSeedString(seeds.end, "End seed"),
    rng: validateNumericSeedString(seeds.rng, "RNG seed"),
  };

  const league = await ctx.db.get("leagues", normalizedSeed.leagueId);
  if (league === null) {
    throw new ConvexError({
      code: "LEAGUE_NOT_EXIST",
      message: "The requested league id does not exist",
    });
  }

  return normalizedSeed;
}

async function requireSeedTestingOpen(ctx: MutationCtx) {
  const settings = await requireSettings(ctx);

  if (settings.seedTestingPaused) {
    throw new ConvexError({
      code: "SEED_TESTING_PAUSED",
      message: "Seed testing is currently paused",
    });
  }

  return settings;
}

function validateNumericSeedString(value: string, label: string) {
  const trimmedValue = value.trim();

  if (!NUMERIC_SEED_PATTERN.test(trimmedValue)) {
    throw new ConvexError({
      code: "INVALID_SEED_VALUE",
      message: `${label} must be a whole number`,
    });
  }

  return trimmedValue;
}
