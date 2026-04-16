import z from "zod";
import { seedTypesArray } from "./consts";
import { Id } from "../../convex/_generated/dataModel";

export const seedTypeValidator = z.enum(seedTypesArray);
export const seedValueValidator = z
  .string("Seed values must be strings")
  .trim()
  .min(1, "Seed value is required")
  .regex(/^[0-9]+$/, "Seed values must contain only numbers");

export const validateManualSeedForm = z.array(
  z.object({
    leagueId: z
      .optional(z.string("League id must be a string"))
      .transform((s) => s as Id<"leagues">),
    overworld: seedValueValidator,
    nether: seedValueValidator,
    end: seedValueValidator,
    rng: seedValueValidator,
    type: seedTypeValidator,
  }),
);
