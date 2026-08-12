/// <reference types="vite/client" />

import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const removeSeedRatings = makeFunctionReference<
  "mutation",
  Record<string, never>,
  { deletedComments: number; deletedSeeds: number; updatedSeeds: number }
>("migration:removeSeedRatings");

describe("seed rating migration", () => {
  test("deletes bad seeds and comments while clearing rating fields from retained seeds", async () => {
    const t = convexTest(schema, modules);
    const { badSeedId, goodSeedId } = await t.run(async (ctx) => {
      const uploaderId = await ctx.db.insert("users", {
        name: "Original Uploader",
        status: "active",
        roles: ["uploader"],
      });
      const leagueId = await ctx.db.insert("leagues", {
        leagueNumber: 1,
        leagueName: "League One",
        seedCount: 1,
        usedSeedCount: 0,
      });
      const goodSeedId = await ctx.db.insert("seeds", {
        seedNumber: 1,
        leagueId,
        assignedWeekNumber: 4,
        rating: "Good",
        votedAt: 10,
        votedBy: uploaderId,
        overworld: "101",
        nether: "102",
        end: "103",
        rng: "104",
        type: "VILLAGE",
        addedBy: uploaderId,
        isUsed: false,
        isExpired: false,
        commentCount: 0,
      });
      const badSeedId = await ctx.db.insert("seeds", {
        rating: "Bad",
        votedAt: 20,
        votedBy: uploaderId,
        overworld: "201",
        nether: "202",
        end: "203",
        rng: "204",
        type: "SHIPWRECK",
        addedBy: uploaderId,
        isUsed: false,
        commentCount: 2,
      });
      await ctx.db.insert("comments", {
        seedId: badSeedId,
        author: uploaderId,
        body: "First legacy comment",
        createdAt: 1,
      });
      await ctx.db.insert("comments", {
        seedId: badSeedId,
        author: uploaderId,
        body: "Second legacy comment",
        createdAt: 2,
      });
      await ctx.db.insert("logs", {
        eventType: "seed.marked_bad",
        actorId: uploaderId,
        actorName: "Original Uploader",
        actorRoles: ["uploader"],
        actorType: "uploader",
        targetType: "seed",
        targetId: badSeedId,
        targetLabel: "Seed 201",
        summary: "Changed the rating from Good to Bad.",
      });

      return { badSeedId, goodSeedId };
    });

    await expect(t.mutation(removeSeedRatings, {})).resolves.toEqual({
      deletedComments: 2,
      deletedSeeds: 1,
      updatedSeeds: 1,
    });

    const result = await t.run(async (ctx) => ({
      badSeed: await ctx.db.get("seeds", badSeedId),
      goodSeed: await ctx.db.get("seeds", goodSeedId),
      badSeedComments: await ctx.db
        .query("comments")
        .withIndex("by_seedId_and_createdAt", (q) => q.eq("seedId", badSeedId))
        .collect(),
      legacyLog: await ctx.db
        .query("logs")
        .withIndex("by_eventType", (q) => q.eq("eventType", "seed.marked_bad"))
        .unique(),
    }));

    expect(result.badSeed).toBeNull();
    expect(result.badSeedComments).toEqual([]);
    expect(result.goodSeed).not.toHaveProperty("rating");
    expect(result.goodSeed).not.toHaveProperty("votedAt");
    expect(result.goodSeed).not.toHaveProperty("votedBy");
    expect(result.legacyLog).toMatchObject({
      eventType: "seed.marked_bad",
      targetId: badSeedId,
    });

    await expect(t.mutation(removeSeedRatings, {})).resolves.toEqual({
      deletedComments: 0,
      deletedSeeds: 0,
      updatedSeeds: 0,
    });
  });
});
