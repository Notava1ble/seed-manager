export const SEED_TYPES = [
  "RUINED_PORTAL",
  "SHIPWRECK",
  "VILLAGE",
  "DESERT_TEMPLE",
  "BURIED_TREASURE",
] as const;

export type SeedType = (typeof SEED_TYPES)[number];
