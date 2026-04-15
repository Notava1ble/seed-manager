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
    usedAt: v.number(), // unix time
    usedBy: v.id("users"),
    upvoteCount: v.number(),
    downvoteCount: v.number(),
    commentCount: v.number(),
  })
    .index("by_leagueId", ["leagueId"])
    .index("by_leagueId_and_isUsed", ["leagueId", "isUsed"]),
  comments: defineTable({
    seedId: v.id("seeds"),
    author: v.id("users"),
    body: v.string(),
    createdAt: v.number(), // unix time
  }),
  votes: defineTable({
    seedId: v.id("seeds"),
    author: v.id("users"),
    voteType: v.union(v.literal("upvote"), v.literal("downvote")),
  }),
});
