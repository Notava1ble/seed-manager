import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import { getUser } from "./users";
import type { Doc } from "./_generated/dataModel";

export function canViewLeague(user: Doc<"users">, league: Doc<"leagues">) {
  const leagueId = league._id;

  if (user.roles.includes("admin")) {
    return true;
  }

  const hasTesterAccess =
    user.roles.includes("tester") && leagueId !== user.homeLeagueId;

  const hasHostAccess =
    user.roles.includes("host") && leagueId === user.hostLeagueId;

  return hasTesterAccess || hasHostAccess;
}

export const listLeagues = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Sign in required",
      });
    }

    if (user.status !== "active") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You do not have access to this data",
      });
    }

    const leagues = await ctx.db.query("leagues").collect();

    return leagues.filter((l) => canViewLeague(user, l));
  },
});
