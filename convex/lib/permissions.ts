import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { getUser } from "../users";
import { Doc } from "../_generated/dataModel";

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

export async function requireActiveUser(ctx: QueryCtx | MutationCtx) {
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

  return user;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireActiveUser(ctx);

  if (!user.roles.includes("admin")) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return user;
}
