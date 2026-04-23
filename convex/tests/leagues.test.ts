import { describe, expect, test } from "vitest";
import { api } from "../_generated/api";
import {
  createActor,
  createLeague,
  createSeedInLeague,
  createTest,
  leagueNumbers,
} from "./test.helpers";

describe("leagues", () => {
  test("admin can create, edit, and delete a league", async () => {
    const t = createTest();
    const { actor: admin } = await createActor(t, { roles: ["admin"] });

    const leagueId = await admin.mutation(api.leagues.addLeague, {
      leagueNumber: 1,
      leagueName: "  League 1  ",
    });

    await admin.mutation(api.leagues.updateLeague, {
      leagueId,
      leagueNumber: 2,
      leagueName: "  League 2  ",
    });

    const editedLeague = await t.run(async (ctx) => {
      return await ctx.db.get("leagues", leagueId);
    });
    expect(editedLeague).toMatchObject({
      leagueNumber: 2,
      leagueName: "League 2",
      seedCount: 0,
      usedSeedCount: 0,
    });

    await admin.mutation(api.leagues.deleteLeague, { leagueId });

    const deletedLeague = await t.run(async (ctx) => {
      return await ctx.db.get("leagues", leagueId);
    });
    expect(deletedLeague).toBeNull();
  });

  test("admin cannot reuse a league number", async () => {
    const t = createTest();
    const { actor: admin } = await createActor(t, { roles: ["admin"] });
    const league1 = await createLeague(t, { leagueNumber: 1 });
    const league2 = await createLeague(t, { leagueNumber: 2 });

    await expect(
      admin.mutation(api.leagues.addLeague, {
        leagueNumber: 1,
        leagueName: "Duplicate League",
      }),
    ).rejects.toThrow("DUPLICATE_LEAGUE_NUMBER");

    await expect(
      admin.mutation(api.leagues.updateLeague, {
        leagueId: league2,
        leagueNumber: 1,
        leagueName: "League 2",
      }),
    ).rejects.toThrow("DUPLICATE_LEAGUE_NUMBER");

    expect(await admin.query(api.leagues.listLeagues)).toHaveLength(2);
    expect(league1).not.toEqual(league2);
  });

  test("admin cannot delete a league that still has seeds", async () => {
    const t = createTest();
    const { actor: admin, userId: adminId } = await createActor(t, {
      roles: ["admin"],
    });
    const leagueId = await createLeague(t);
    await createSeedInLeague(t, leagueId, adminId);

    await expect(
      admin.mutation(api.leagues.deleteLeague, { leagueId }),
    ).rejects.toThrow("LEAGUE_HAS_SEEDS");

    expect(await admin.query(api.leagues.listLeagues)).toHaveLength(1);
  });

  test("testers and hosts cannot manage leagues", async () => {
    const t = createTest();
    const leagueId = await createLeague(t, { leagueNumber: 1 });
    const { actor: tester } = await createActor(t, { roles: ["tester"] });
    const { actor: host } = await createActor(t, { roles: ["host"] });

    await expect(
      tester.mutation(api.leagues.addLeague, {
        leagueNumber: 2,
        leagueName: "League 2",
      }),
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      host.mutation(api.leagues.updateLeague, {
        leagueId,
        leagueNumber: 2,
        leagueName: "League 2",
      }),
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      tester.mutation(api.leagues.deleteLeague, { leagueId }),
    ).rejects.toThrow("FORBIDDEN");
  });

  test("admins list all leagues in league number order", async () => {
    const t = createTest();
    await createLeague(t, { leagueNumber: 3 });
    await createLeague(t, { leagueNumber: 1 });
    await createLeague(t, { leagueNumber: 2 });
    const { actor: admin } = await createActor(t, { roles: ["admin"] });

    const leagues = await admin.query(api.leagues.listLeagues);

    expect(leagueNumbers(leagues)).toEqual([1, 2, 3]);
  });

  test("testers list all leagues except their home leagues", async () => {
    const t = createTest();
    const league1 = await createLeague(t, { leagueNumber: 1 });
    const league2 = await createLeague(t, { leagueNumber: 2 });
    const league3 = await createLeague(t, { leagueNumber: 3 });
    const { actor: tester } = await createActor(t, {
      roles: ["tester"],
      homeLeagueId: [league2],
    });
    const { actor: testerWithNoHomeLeague } = await createActor(t, {
      roles: ["tester"],
    });

    expect(leagueNumbers(await tester.query(api.leagues.listLeagues))).toEqual([
      1, 3,
    ]);
    expect(
      leagueNumbers(await testerWithNoHomeLeague.query(api.leagues.listLeagues)),
    ).toEqual([1, 2, 3]);
    expect([league1, league2, league3]).toHaveLength(3);
  });

  test("hosts list only hosted leagues", async () => {
    const t = createTest();
    await createLeague(t, { leagueNumber: 1 });
    const league2 = await createLeague(t, { leagueNumber: 2 });
    const league3 = await createLeague(t, { leagueNumber: 3 });
    const { actor: host } = await createActor(t, {
      roles: ["host"],
      hostLeagueId: [league2, league3],
    });
    const { actor: hostWithNoLeagues } = await createActor(t, {
      roles: ["host"],
    });

    expect(leagueNumbers(await host.query(api.leagues.listLeagues))).toEqual([
      2, 3,
    ]);
    expect(
      leagueNumbers(await hostWithNoLeagues.query(api.leagues.listLeagues)),
    ).toEqual([]);
  });

  test("host access can include a tester home league", async () => {
    const t = createTest();
    await createLeague(t, { leagueNumber: 1 });
    const league2 = await createLeague(t, { leagueNumber: 2 });
    await createLeague(t, { leagueNumber: 3 });
    const { actor: testerHost } = await createActor(t, {
      roles: ["tester", "host"],
      homeLeagueId: [league2],
      hostLeagueId: [league2],
    });

    const leagues = await testerHost.query(api.leagues.listLeagues);

    expect(leagueNumbers(leagues)).toEqual([1, 2, 3]);
  });

  test("users without active roles cannot see leagues", async () => {
    const t = createTest();
    await createLeague(t, { leagueNumber: 1 });
    const { actor: noRoleUser } = await createActor(t);
    const { actor: pendingTester } = await createActor(t, {
      roles: ["tester"],
      status: "pending",
    });

    expect(await noRoleUser.query(api.leagues.listLeagues)).toEqual([]);
    await expect(pendingTester.query(api.leagues.listLeagues)).rejects.toThrow(
      "FORBIDDEN",
    );
    await expect(t.query(api.leagues.listLeagues)).rejects.toThrow(
      "UNAUTHORIZED",
    );
  });
});
