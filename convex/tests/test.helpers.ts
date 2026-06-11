import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import type { Doc, Id } from "../_generated/dataModel";
import schema from "../schema";
import { modules } from "./test.setup";

type SeedManagerTest = TestConvex<typeof schema>;
type UserRole = "admin" | "host" | "tester" | "uploader";
type UserStatus = "active" | "pending";

let nextUserNumber = 1;
let nextLeagueNumber = 1;
let nextSeedNumber = 1;

export function createTest() {
  return convexTest(schema, modules);
}

export async function createActor(
  t: SeedManagerTest,
  options: {
    roles?: UserRole[];
    status?: UserStatus;
    homeLeagueId?: Id<"leagues">[];
    hostLeagueId?: Id<"leagues">[];
  } = {},
) {
  const name = `User ${nextUserNumber++}`;
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      name,
      lowercaseName: name.toLowerCase(),
      status: options.status ?? "active",
      roles: options.roles ?? [],
      homeLeagueId: options.homeLeagueId ?? [],
      hostLeagueId: options.hostLeagueId ?? [],
    });
  });

  return {
    userId,
    name,
    actor: t.withIdentity({ subject: userId, name }),
  };
}

export async function createLeague(
  t: SeedManagerTest,
  options: {
    leagueNumber?: number;
    leagueName?: string;
  } = {},
) {
  const leagueNumber = options.leagueNumber ?? nextLeagueNumber++;

  return await t.run(async (ctx) => {
    return await ctx.db.insert("leagues", {
      leagueNumber,
      leagueName: options.leagueName ?? `League ${leagueNumber}`,
      seedCount: 0,
      usedSeedCount: 0,
    });
  });
}

export async function createSeedInLeague(
  t: SeedManagerTest,
  leagueId: Id<"leagues">,
  addedBy: Id<"users">,
) {
  const seedNumber = nextSeedNumber++;

  return await t.run(async (ctx) => {
    return await ctx.db.insert("seeds", {
      leagueId,
      rating: "Good",
      overworld: `${seedNumber}001`,
      nether: `${seedNumber}002`,
      end: `${seedNumber}003`,
      rng: `${seedNumber}004`,
      addedBy,
      isUsed: false,
      isExpired: false,
      commentCount: 0,
    });
  });
}

export function leagueNumbers(leagues: Doc<"leagues">[]) {
  return leagues.map((league) => league.leagueNumber);
}
