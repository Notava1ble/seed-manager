import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    discordId: v.optional(v.string()),
    name: v.optional(v.string()), // Discord username for migrated users, GitHub username for legacy users.
    email: v.optional(v.string()),
    lowercaseName: v.optional(v.string()), // Normalized `name` field
    image: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("deleted"),
      v.literal("banned"),
    ),
    roles: v.array(
      v.union(v.literal("admin"), v.literal("host"), v.literal("tester")),
    ),
    homeLeagueId: v.optional(v.array(v.id("leagues"))),
    hostLeagueId: v.optional(v.array(v.id("leagues"))),
    settings: v.optional(
      v.object({
        claimBuriedTreasureSeeds: v.optional(v.boolean()),
      }),
    ),
  })
    .index("email", ["email"])
    .index("by_discordId", ["discordId"])
    .index("lowercase_name", ["lowercaseName"])
    .index("by_status", ["status"]),
  leagues: defineTable({
    leagueNumber: v.number(),
    leagueName: v.string(), // Like "League 1"
    seedCount: v.number(),
    usedSeedCount: v.number(),
  }).index("by_leagueNumber", ["leagueNumber"]),
  settings: defineTable({
    key: v.literal("global"),
    currentWeekNumber: v.number(),
    seedTestingPaused: v.boolean(),
  }).index("by_key", ["key"]),
  seeds: defineTable({
    leagueId: v.optional(v.id("leagues")),
    claimedBy: v.optional(v.id("users")),
    rating: v.optional(v.union(v.literal("Good"), v.literal("Bad"))),
    overworld: v.string(),
    nether: v.string(),
    end: v.string(),
    rng: v.string(),
    type: v.optional(
      v.union(
        v.literal("BURIED_TREASURE"),
        v.literal("VILLAGE"),
        v.literal("DESERT_TEMPLE"),
        v.literal("RUINED_PORTAL"),
        v.literal("SHIPWRECK"),
      ),
    ),
    isBt: v.optional(v.boolean()),
    addedBy: v.id("users"),
    isUsed: v.boolean(),
    isExpired: v.optional(v.boolean()), // undefined = never assigned, false = active assigned, true = expired
    assignedWeekNumber: v.optional(v.number()),
    votedAt: v.optional(v.number()),
    votedBy: v.optional(v.id("users")),
    usedAt: v.optional(v.number()), // unix time
    usedBy: v.optional(v.id("users")),
    leagueChangedByAdminId: v.optional(v.id("users")),
    commentCount: v.number(),
  })
    .index("by_owseed", ["overworld"])
    .index("by_leagueId", ["leagueId"])
    .index("by_isExpired", ["isExpired"])
    .index("by_rating", ["rating"])
    .index("by_rating_and_leagueId", ["rating", "leagueId"])
    .index("by_leagueId_and_isExpired", ["leagueId", "isExpired"])
    .index("by_isExpired_and_claimedBy_and_rating", [
      "isExpired",
      "claimedBy",
      "rating",
    ])
    .index("by_isExpired_and_claimedBy_and_rating_and_isBt", [
      "isExpired",
      "claimedBy",
      "rating",
      "isBt",
    ])
    .index("by_isExpired_and_claimedBy_and_rating_and_type", [
      "isExpired",
      "claimedBy",
      "rating",
      "type",
    ]),
  comments: defineTable({
    seedId: v.id("seeds"),
    author: v.id("users"),
    body: v.string(),
    createdAt: v.number(), // unix time
  }).index("by_seedId_and_createdAt", ["seedId", "createdAt"]),
});
