import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    lowercaseName: v.optional(v.string()),
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
    homeLeagueId: v.optional(v.id("leagues")),
    hostLeagueId: v.optional(v.id("leagues")),
  })
    .index("email", ["email"])
    .index("lowercase_name", ["lowercaseName"]),
  leagues: defineTable({
    leagueNumber: v.number(),
    leagueName: v.string(), // Like "League 1"
    seedCount: v.number(),
    usedSeedCount: v.number(),
  }).index("by_leagueNumber", ["leagueNumber"]),
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
    addedBy: v.id("users"),
    isUsed: v.boolean(),
    usedAt: v.optional(v.number()), // unix time
    usedBy: v.optional(v.id("users")),
    commentCount: v.number(),
  })
    .index("by_owseed", ["overworld"])
    .index("by_leagueId", ["leagueId"])
    .index("by_leagueId_and_isUsed", ["leagueId", "isUsed"])
    .index("by_leagueId_and_rating_and_isUsed", [
      "leagueId",
      "rating",
      "isUsed",
    ])
    .index("by_claimedBy_and_rating", ["claimedBy", "rating"])
    .index("by_leagueId_and_claimedBy_and_rating_and_isUsed", [
      "leagueId",
      "claimedBy",
      "rating",
      "isUsed",
    ]),
  comments: defineTable({
    seedId: v.id("seeds"),
    author: v.id("users"),
    body: v.string(),
    createdAt: v.number(), // unix time
  }),
});
