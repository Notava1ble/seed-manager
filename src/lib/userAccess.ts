import type { Doc, Id } from "../../convex/_generated/dataModel";

export type ManagedRole = "host" | "tester";
export type UserRole = "admin" | ManagedRole;

export const EMPTY_LEAGUE_VALUE = null;

export function getLeagueLabel(
  leagues: Doc<"leagues">[],
  leagueId: Id<"leagues"> | null | undefined,
) {
  if (!leagueId) {
    return "No league";
  }

  return (
    leagues.find((league) => league._id === leagueId)?.leagueName ??
    "Unknown league"
  );
}

export function getUserLabel(user: Doc<"users">) {
  return user.name ?? user.lowercaseName ?? user.email ?? "Unnamed user";
}

export function getManagedRoles(user: Doc<"users">): ManagedRole[] {
  return user.roles.filter(isManagedRole);
}

export function getManagedUserValues(user: Doc<"users">) {
  return {
    roles: getManagedRoles(user),
    homeLeagueId: user.homeLeagueId ?? null,
    hostLeagueId: user.hostLeagueId ?? null,
  };
}

export function haveSameManagedRoles(
  firstRoles: ManagedRole[],
  secondRoles: ManagedRole[],
) {
  return (
    firstRoles.length === secondRoles.length &&
    firstRoles.every((role) => secondRoles.includes(role))
  );
}

export function isManagedRole(role: unknown): role is ManagedRole {
  return role === "host" || role === "tester";
}

export function updateManagedRole(
  currentRoles: ManagedRole[],
  role: ManagedRole,
  checked: boolean,
) {
  if (checked) {
    return currentRoles.includes(role) ? currentRoles : [...currentRoles, role];
  }

  return currentRoles.filter((currentRole) => currentRole !== role);
}
