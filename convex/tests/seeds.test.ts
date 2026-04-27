import { describe, expect, test } from "vitest";
import { api } from "../_generated/api";
import {
  createActor,
  createLeague,
  createTest,
} from "./test.helpers";

describe("seeds", () => {
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
});
