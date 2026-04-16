import z from "zod";
import { seedTypesArray } from "./consts";
import { Id } from "../../convex/_generated/dataModel";

export const seedTypeValidator = z.enum(seedTypesArray);
export const seedValueValidator = z.string("League id must be a string");

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
