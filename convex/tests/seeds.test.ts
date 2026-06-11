import { describe, expect, test } from "vitest";
import { api } from "../_generated/api";
import {
  createActor,
  createLeague,
  createTest,
} from "./test.helpers";

describe("seeds", () => {
  test("admins can change an active assigned seed's league and track the admin", async () => {
    const t = createTest();
    const { actor: admin, userId: adminId } = await createActor(t, {
      roles: ["admin"],
    });
    const sourceLeagueId = await createLeague(t, { leagueNumber: 1 });
    const targetLeagueId = await createLeague(t, { leagueNumber: 2 });
    const seedId = await t.run(async (ctx) => {
      await ctx.db.patch("leagues", sourceLeagueId, { seedCount: 1 });

      return await ctx.db.insert("seeds", {
        leagueId: sourceLeagueId,
        overworld: "1001",
        nether: "1002",
        end: "1003",
        rng: "1004",
        type: "VILLAGE",
        rating: "Good",
        addedBy: adminId,
        isUsed: false,
        isExpired: false,
        commentCount: 0,
      });
    });

    await admin.mutation(api.seeds.changeSeedLeague, {
      seedId,
      leagueId: targetLeagueId,
    });

    const result = await t.run(async (ctx) => {
      const seed = await ctx.db.get("seeds", seedId);
      const sourceLeague = await ctx.db.get("leagues", sourceLeagueId);
      const targetLeague = await ctx.db.get("leagues", targetLeagueId);

      return { seed, sourceLeague, targetLeague };
    });

    expect(result.seed).toMatchObject({
      leagueId: targetLeagueId,
      leagueChangedByAdminId: adminId,
    });
    expect(result.sourceLeague?.seedCount).toBe(0);
    expect(result.targetLeague?.seedCount).toBe(1);
  });

  test("admins can see who vouched a league seed in seed details", async () => {
    const t = createTest();
    const { actor: admin, userId: adminId } = await createActor(t, {
      roles: ["admin"],
    });
    const homeLeagueId = await createLeague(t, { leagueNumber: 1 });
    const hostLeagueId = await createLeague(t, { leagueNumber: 2 });
    const { name: testerName, userId: testerId } = await createActor(t, {
      roles: ["tester", "host"],
      homeLeagueId: [homeLeagueId],
      hostLeagueId: [hostLeagueId],
    });
    const leagueId = await createLeague(t);
    const seedId = await t.run(async (ctx) => {
      return await ctx.db.insert("seeds", {
        leagueId,
        claimedBy: testerId,
        overworld: "1001",
        nether: "1002",
        end: "1003",
        rng: "1004",
        type: "VILLAGE",
        rating: "Good",
        addedBy: adminId,
        isUsed: false,
        isExpired: false,
        commentCount: 0,
      });
    });

    const seedDetails = await admin.query(api.seeds.getSeedForLeague, {
      leagueId,
      seedId,
    });

    expect(seedDetails).toMatchObject({
      _id: seedId,
      claimedBy: testerId,
      vouchedByUser: {
        _id: testerId,
        name: testerName,
        homeLeagueId: [homeLeagueId],
        hostLeagueId: [hostLeagueId],
      },
    });
  });

  test("admins list only unexpired and non-bad seeds", async () => {
    const t = createTest();
    const { actor: admin, userId: adminId } = await createActor(t, {
      roles: ["admin"],
    });
    const leagueId = await createLeague(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("seeds", {
        leagueId,
        overworld: "1001",
        nether: "1002",
        end: "1003",
        rng: "1004",
        rating: "Good",
        addedBy: adminId,
        isUsed: false,
        isExpired: false,
        commentCount: 0,
      });
      await ctx.db.insert("seeds", {
        overworld: "2001",
        nether: "2002",
        end: "2003",
        rng: "2004",
        addedBy: adminId,
        isUsed: false,
        commentCount: 0,
      });
      await ctx.db.insert("seeds", {
        overworld: "3001",
        nether: "3002",
        end: "3003",
        rng: "3004",
        addedBy: adminId,
        isUsed: false,
        isExpired: true,
        commentCount: 0,
      });
      await ctx.db.insert("seeds", {
        overworld: "4001",
        nether: "4002",
        end: "4003",
        rng: "4004",
        rating: "Bad",
        addedBy: adminId,
        isUsed: false,
        commentCount: 0,
      });
    });

    const seeds = await admin.query(api.seeds.listAllSeeds);

    expect(seeds.map((seed) => seed.overworld).sort()).toEqual([
      "1001",
      "2001",
    ]);
  });

  test("admins can list and recycle bad seeds", async () => {
    const t = createTest();
    const { actor: admin, userId: adminId } = await createActor(t, {
      roles: ["admin"],
    });
    const { userId: testerId } = await createActor(t, {
      roles: ["tester"],
    });
    const votedAt = Date.now();
    const seedId = await t.run(async (ctx) => {
      return await ctx.db.insert("seeds", {
        claimedBy: testerId,
        overworld: "5001",
        nether: "5002",
        end: "5003",
        rng: "5004",
        type: "VILLAGE",
        rating: "Bad",
        addedBy: adminId,
        isUsed: false,
        votedAt,
        votedBy: testerId,
        commentCount: 0,
      });
    });

    const badSeeds = await admin.query(api.seeds.listBadSeeds);

    expect(badSeeds).toHaveLength(1);
    expect(badSeeds[0]).toMatchObject({
      _id: seedId,
      overworld: "5001",
      votedAt,
      votedBy: testerId,
      votedByUser: {
        _id: testerId,
      },
    });

    await admin.mutation(api.seeds.recycleBadSeed, { seedId });

    const seed = await t.run(async (ctx) => {
      return await ctx.db.get("seeds", seedId);
    });

    expect(seed).toMatchObject({
      _id: seedId,
      overworld: "5001",
      isUsed: false,
      commentCount: 0,
    });
    expect(seed?.claimedBy).toBeUndefined();
    expect(seed?.rating).toBeUndefined();
    expect(seed?.votedAt).toBeUndefined();
    expect(seed?.votedBy).toBeUndefined();
  });

  test("hosts can import seeds for leagues they host, but not other leagues", async () => {
    const t = createTest();
    const league1 = await createLeague(t, { leagueNumber: 1 });
    const league2 = await createLeague(t, { leagueNumber: 2 });

    await t.run(async (ctx) => {
      await ctx.db.insert("settings", {
        key: "global",
        currentWeekNumber: 1,
        seedTestingPaused: false,
      });
    });

    const { actor: host, userId: hostId } = await createActor(t, {
      roles: ["host"],
      hostLeagueId: [league1],
    });

    const { actor: tester } = await createActor(t, {
      roles: ["tester"],
    });

    // 1. Host uploads to their hosted league - should succeed
    const importResult = await host.mutation(api.seeds.importSeeds, {
      seeds: [
        {
          type: "VILLAGE",
          overworld: "1111",
          nether: "2222",
          end: "3333",
          rng: "4444",
          leagueId: league1,
        },
      ],
    });
    expect(importResult.insertedCount).toBe(1);

    const [seed] = await host.query(api.seeds.listSeedsByLeague, {
      leagueId: league1,
    });
    expect(seed).toMatchObject({
      overworld: "1111",
      nether: "2222",
      end: "3333",
      rng: "4444",
      type: "VILLAGE",
      leagueId: league1,
      rating: "Good",
      isExpired: false,
      assignedWeekNumber: 1,
      addedBy: hostId,
      isUsed: false,
      commentCount: 0,
    });
    expect(seed.directUploaderAssignmentBy).toBeUndefined();
    expect(seed.uploadedByUploaderId).toBeUndefined();

    const [hostedLeague] = await host.query(api.leagues.listLeagues);
    expect(hostedLeague.seedCount).toBe(1);

    // 2. Host uploads unassigned seed - should fail
    await expect(
      host.mutation(api.seeds.importSeeds, {
        seeds: [
          {
            type: "VILLAGE",
            overworld: "5555",
            nether: "6666",
            end: "7777",
            rng: "8888",
          },
        ],
      }),
    ).rejects.toThrow();

    // 3. Host uploads to a league they don't host - should fail
    await expect(
      host.mutation(api.seeds.importSeeds, {
        seeds: [
          {
            type: "VILLAGE",
            overworld: "5555",
            nether: "6666",
            end: "7777",
            rng: "8888",
            leagueId: league2,
          },
        ],
      }),
    ).rejects.toThrow();

    // 4. Non-host non-admin tester uploads - should fail
    await expect(
      tester.mutation(api.seeds.importSeeds, {
        seeds: [
          {
            type: "VILLAGE",
            overworld: "9999",
            nether: "1010",
            end: "1111",
            rng: "1212",
            leagueId: league1,
          },
        ],
      }),
    ).rejects.toThrow();
  });

  test("hosts cannot import seeds while seed testing is paused", async () => {
    const t = createTest();
    const leagueId = await createLeague(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("settings", {
        key: "global",
        currentWeekNumber: 1,
        seedTestingPaused: true,
      });
    });

    const { actor: host } = await createActor(t, {
      roles: ["host"],
      hostLeagueId: [leagueId],
    });

    await expect(
      host.mutation(api.seeds.importSeeds, {
        seeds: [
          {
            type: "VILLAGE",
            overworld: "5555",
            nether: "6666",
            end: "7777",
            rng: "8888",
            leagueId,
          },
        ],
      }),
    ).rejects.toThrow("Seed testing is currently paused");
  });

  test("uploaders can import unassigned seeds", async () => {
    const t = createTest();
    await t.run(async (ctx) => {
      await ctx.db.insert("settings", {
        key: "global",
        currentWeekNumber: 1,
        seedTestingPaused: false,
      });
    });
    const { actor: uploader, userId: uploaderId } = await createActor(t, {
      roles: ["uploader"],
    });

    const importResult = await uploader.mutation(api.seeds.importSeeds, {
      seeds: [
        {
          type: "VILLAGE",
          overworld: "2111",
          nether: "2222",
          end: "2333",
          rng: "2444",
        },
      ],
    });

    expect(importResult.insertedCount).toBe(1);
    const [seed] = await t.run(async (ctx) =>
      ctx.db
        .query("seeds")
        .withIndex("by_owseed", (q) => q.eq("overworld", "2111"))
        .collect(),
    );
    expect(seed).toMatchObject({
      addedBy: uploaderId,
      uploadedByUploaderId: uploaderId,
    });
    expect(seed.leagueId).toBeUndefined();
    expect(seed.directUploaderAssignmentBy).toBeUndefined();
  });

  test("uploaders can directly import assigned seeds outside home leagues", async () => {
    const t = createTest();
    const homeLeagueId = await createLeague(t, { leagueNumber: 1 });
    const targetLeagueId = await createLeague(t, { leagueNumber: 2 });
    await t.run(async (ctx) => {
      await ctx.db.insert("settings", {
        key: "global",
        currentWeekNumber: 7,
        seedTestingPaused: false,
      });
    });
    const { actor: uploader, userId: uploaderId } = await createActor(t, {
      roles: ["uploader"],
      homeLeagueId: [homeLeagueId],
    });

    await uploader.mutation(api.seeds.importSeeds, {
      seeds: [
        {
          type: "SHIPWRECK",
          overworld: "3111",
          nether: "3222",
          end: "3333",
          rng: "3444",
          leagueId: targetLeagueId,
        },
      ],
    });

    const seed = await t.run(async (ctx) =>
      ctx.db
        .query("seeds")
        .withIndex("by_owseed", (q) => q.eq("overworld", "3111"))
        .unique(),
    );
    expect(seed).toMatchObject({
      leagueId: targetLeagueId,
      rating: "Good",
      isExpired: false,
      assignedWeekNumber: 7,
      addedBy: uploaderId,
      uploadedByUploaderId: uploaderId,
      directUploaderAssignmentBy: uploaderId,
    });
  });

  test("uploaders cannot directly import assigned seeds into current home leagues", async () => {
    const t = createTest();
    const homeLeagueId = await createLeague(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("settings", {
        key: "global",
        currentWeekNumber: 1,
        seedTestingPaused: false,
      });
    });
    const { actor: uploader } = await createActor(t, {
      roles: ["uploader"],
      homeLeagueId: [homeLeagueId],
    });

    await expect(
      uploader.mutation(api.seeds.importSeeds, {
        seeds: [
          {
            type: "VILLAGE",
            overworld: "4111",
            nether: "4222",
            end: "4333",
            rng: "4444",
            leagueId: homeLeagueId,
          },
        ],
      }),
    ).rejects.toThrow("Uploaders cannot assign seeds to leagues they play in");
  });

  test("testers cannot vouch uploader-added seeds into the uploader's current home league", async () => {
    const t = createTest();
    const homeLeagueId = await createLeague(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("settings", {
        key: "global",
        currentWeekNumber: 1,
        seedTestingPaused: false,
      });
    });
    const { actor: uploader } = await createActor(t, {
      roles: ["uploader"],
      homeLeagueId: [homeLeagueId],
    });
    const { actor: tester, userId: testerId } = await createActor(t, {
      roles: ["tester"],
    });

    const seedId = await uploader.mutation(api.seeds.importSeeds, {
      seeds: [
        {
          type: "VILLAGE",
          overworld: "5111",
          nether: "5222",
          end: "5333",
          rng: "5444",
        },
      ],
    }).then(async () => {
      const seed = await t.run(async (ctx) =>
        ctx.db
          .query("seeds")
          .withIndex("by_owseed", (q) => q.eq("overworld", "5111"))
          .unique(),
      );
      return seed!._id;
    });

    await t.run(async (ctx) => {
      await ctx.db.patch("seeds", seedId, { claimedBy: testerId });
    });

    await expect(
      tester.mutation(api.seeds.vouchSeed, {
        seedId,
        rating: "Good",
        leagueId: homeLeagueId,
      }),
    ).rejects.toThrow("This seed was uploaded by a player in that league");
  });

  test("tester-vouched uploader pool seeds do not show direct uploader assignment metadata", async () => {
    const t = createTest();
    const uploaderHomeLeagueId = await createLeague(t, { leagueNumber: 1 });
    const targetLeagueId = await createLeague(t, { leagueNumber: 2 });
    await t.run(async (ctx) => {
      await ctx.db.insert("settings", {
        key: "global",
        currentWeekNumber: 3,
        seedTestingPaused: false,
      });
    });
    const { actor: uploader, userId: uploaderId } = await createActor(t, {
      roles: ["uploader"],
      homeLeagueId: [uploaderHomeLeagueId],
    });
    const { actor: tester, userId: testerId } = await createActor(t, {
      roles: ["tester"],
    });

    await uploader.mutation(api.seeds.importSeeds, {
      seeds: [
        {
          type: "VILLAGE",
          overworld: "6111",
          nether: "6222",
          end: "6333",
          rng: "6444",
        },
      ],
    });
    const seedId = await t.run(async (ctx) => {
      const seed = await ctx.db
        .query("seeds")
        .withIndex("by_owseed", (q) => q.eq("overworld", "6111"))
        .unique();
      await ctx.db.patch("seeds", seed!._id, { claimedBy: testerId });
      return seed!._id;
    });

    await tester.mutation(api.seeds.vouchSeed, {
      seedId,
      rating: "Good",
      leagueId: targetLeagueId,
    });

    const seed = await t.run(async (ctx) => ctx.db.get("seeds", seedId));
    expect(seed).toMatchObject({
      leagueId: targetLeagueId,
      uploadedByUploaderId: uploaderId,
      claimedBy: testerId,
      rating: "Good",
    });
    expect(seed?.directUploaderAssignmentBy).toBeUndefined();
  });

  test("uploader home league changes affect future tester assignment eligibility", async () => {
    const t = createTest();
    const oldHomeLeagueId = await createLeague(t, { leagueNumber: 1 });
    const newHomeLeagueId = await createLeague(t, { leagueNumber: 2 });
    await t.run(async (ctx) => {
      await ctx.db.insert("settings", {
        key: "global",
        currentWeekNumber: 4,
        seedTestingPaused: false,
      });
    });
    const { actor: uploader, userId: uploaderId } = await createActor(t, {
      roles: ["uploader"],
      homeLeagueId: [oldHomeLeagueId],
    });
    const { actor: tester, userId: testerId } = await createActor(t, {
      roles: ["tester"],
    });

    await uploader.mutation(api.seeds.importSeeds, {
      seeds: [
        {
          type: "VILLAGE",
          overworld: "7111",
          nether: "7222",
          end: "7333",
          rng: "7444",
        },
        {
          type: "SHIPWRECK",
          overworld: "8111",
          nether: "8222",
          end: "8333",
          rng: "8444",
        },
      ],
    });
    const { allowedSeedId, blockedSeedId } = await t.run(async (ctx) => {
      const allowedSeed = await ctx.db
        .query("seeds")
        .withIndex("by_owseed", (q) => q.eq("overworld", "7111"))
        .unique();
      const blockedSeed = await ctx.db
        .query("seeds")
        .withIndex("by_owseed", (q) => q.eq("overworld", "8111"))
        .unique();
      await ctx.db.patch("users", uploaderId, {
        homeLeagueId: [newHomeLeagueId],
      });
      await ctx.db.patch("seeds", allowedSeed!._id, { claimedBy: testerId });
      await ctx.db.patch("seeds", blockedSeed!._id, { claimedBy: testerId });
      return {
        allowedSeedId: allowedSeed!._id,
        blockedSeedId: blockedSeed!._id,
      };
    });

    await tester.mutation(api.seeds.vouchSeed, {
      seedId: allowedSeedId,
      rating: "Good",
      leagueId: oldHomeLeagueId,
    });

    await expect(
      tester.mutation(api.seeds.vouchSeed, {
        seedId: blockedSeedId,
        rating: "Good",
        leagueId: newHomeLeagueId,
      }),
    ).rejects.toThrow("This seed was uploaded by a player in that league");
  });

  test("admins can assign uploader-added seeds into uploader home leagues", async () => {
    const t = createTest();
    const homeLeagueId = await createLeague(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("settings", {
        key: "global",
        currentWeekNumber: 5,
        seedTestingPaused: false,
      });
    });
    const { actor: admin, userId: adminId } = await createActor(t, {
      roles: ["admin"],
    });
    const { actor: uploader } = await createActor(t, {
      roles: ["uploader"],
      homeLeagueId: [homeLeagueId],
    });
    await uploader.mutation(api.seeds.importSeeds, {
      seeds: [
        {
          type: "VILLAGE",
          overworld: "9111",
          nether: "9222",
          end: "9333",
          rng: "9444",
        },
      ],
    });
    const seedId = await t.run(async (ctx) => {
      const seed = await ctx.db
        .query("seeds")
        .withIndex("by_owseed", (q) => q.eq("overworld", "9111"))
        .unique();
      await ctx.db.patch("seeds", seed!._id, { claimedBy: adminId });
      return seed!._id;
    });

    await admin.mutation(api.seeds.vouchSeed, {
      seedId,
      rating: "Good",
      leagueId: homeLeagueId,
    });

    const seed = await t.run(async (ctx) => ctx.db.get("seeds", seedId));
    expect(seed).toMatchObject({
      leagueId: homeLeagueId,
      rating: "Good",
    });
  });
});
