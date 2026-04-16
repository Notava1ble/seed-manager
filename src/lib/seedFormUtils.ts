import type { KeyboardEvent } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import type { SeedType } from "./consts";

export const MAX_SEED_IMPORT_COUNT = 500;

export type SeedFormValues = {
  type: SeedType | null;
  leagueId: Id<"leagues"> | null;
  overworld: string;
  nether: string;
  end: string;
  rng: string;
};

export type SeedFormErrors = Partial<Record<keyof SeedFormValues, string>> & {
  form?: string;
  file?: string;
};

export type SeedUploadInput = {
  type: SeedType;
  leagueId?: Id<"leagues">;
  overworld: string;
  nether: string;
  end: string;
  rng: string;
};

export function sanitizeSeedNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function preventNonNumericSeedInput(
  event: KeyboardEvent<HTMLInputElement>,
) {
  if (event.ctrlKey || event.metaKey) {
    return;
  }

  const allowedKeys = [
    "Backspace",
    "Delete",
    "Tab",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
  ];

  const isDigit = /^[0-9]$/.test(event.key);

  if (!isDigit && !allowedKeys.includes(event.key)) {
    event.preventDefault();
  }
}
