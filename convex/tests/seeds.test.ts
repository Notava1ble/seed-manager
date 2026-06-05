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
});
