export type SeedRating = "Good" | "Bad";
export type SeedStatus =
  | "used"
  | "open"
  | "assigned"
  | "rejected"
  | "claimed"
  | "unassigned";

export function getSeedStatus(seed: {
  isUsed: boolean;
  leagueId?: string;
  claimedBy?: string;
  rating?: SeedRating;
}): SeedStatus {
  if (seed.isUsed) {
    return "used";
  }

  if (seed.leagueId) {
    return "assigned";
  }

  if (seed.rating === "Bad") {
    return "rejected";
  }

  if (seed.claimedBy) {
    return "claimed";
  }

  return "unassigned";
}
