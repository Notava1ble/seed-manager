export type SeedRating = "Good" | "Bad";
export type SeedStatus =
  | "expired"
  | "used"
  | "open"
  | "assigned"
  | "rejected"
  | "claimed"
  | "unassigned";

export function getSeedStatus(seed: {
  isUsed: boolean;
  isExpired?: boolean;
  leagueId?: string;
  rating?: SeedRating;
}): SeedStatus {
  if (seed.isExpired) {
    return "expired";
  }

  if (seed.isUsed) {
    return "used";
  }

  if (seed.leagueId) {
    return "assigned";
  }

  if (seed.rating === "Bad") {
    return "rejected";
  }

  return "unassigned";
}
