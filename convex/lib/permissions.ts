import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function getUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }

  return await ctx.db.get("users", userId);
}

export function canViewLeague(
  user: Doc<"users">,
  league: Doc<"leagues"> | undefined,
) {
  const leagueId = league?._id;

  if (user.roles.includes("admin")) {
    return true;
  }

  if (leagueId === undefined) {
    return false;
  }

  const homeLeagueIds = user.homeLeagueId ?? [];
  const hostLeagueIds = user.hostLeagueId ?? [];

  const hasTesterAccess =
    user.roles.includes("tester") && !homeLeagueIds.includes(leagueId);

  const hasHostAccess =
    user.roles.includes("host") && hostLeagueIds.includes(leagueId);

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
