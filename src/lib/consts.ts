export const SEED_TYPES = {
  BURIED_TREASURE: "Buried Treasure",
  DESERT_TEMPLE: "Desert Temple",
  RUINED_PORTAL: "Ruined Portal",
  SHIPWRECK: "Shipwreck",
  VILLAGE: "Village",
} as const;

export const seedTypesArray = Object.keys(SEED_TYPES) as SeedType[];

export type SeedType = keyof typeof SEED_TYPES;
