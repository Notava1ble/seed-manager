import { z, type ZodIssue } from "zod";
import type { Doc } from "../../convex/_generated/dataModel";
import { MAX_SEED_IMPORT_COUNT, type SeedUploadInput } from "./seedFormUtils";
import {
  seedTypeValidator,
  seedValueValidator as seedNumberSchema,
} from "./validators";

type SeedJsonParseResult =
  | { success: true; seeds: SeedUploadInput[] }
  | { success: false; errors: string[] };

export async function parseSeedJsonImportFile(
  file: File,
  leagues: Doc<"leagues">[],
): Promise<SeedJsonParseResult> {
  return parseSeedJsonImportText(await file.text(), leagues);
}

export function parseSeedJsonImportText(
  text: string,
  leagues: Doc<"leagues">[],
): SeedJsonParseResult {
  let json: unknown;

  try {
    json = JSON.parse(text) as unknown;
  } catch {
    return {
      success: false,
      errors: ["file: File must contain valid JSON"],
    };
  }

  const seedJsonRootSchema = createSeedJsonRootSchema(leagues);
  const result = seedJsonRootSchema.safeParse(json);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map(formatZodIssue),
    };
  }

  return {
    success: true,
    seeds: result.data,
  };
}

function createSeedJsonRootSchema(leagues: Doc<"leagues">[]) {
  const leagueIdByNumber = new Map(
    leagues.map((league) => [league.leagueNumber, league._id]),
  );

  const leagueNumberSchema = z
    .number("League number must be a number")
    .int("League number must be a whole number")
    .positive("League number must be positive")
    .refine((leagueNumber) => leagueIdByNumber.has(leagueNumber), {
      message: "No league exists with this number",
    })
    .optional();

  const seedJsonSchema = z
    .strictObject({
      leagueNumber: leagueNumberSchema,
      overworld: seedNumberSchema,
      nether: seedNumberSchema,
      end: seedNumberSchema,
      rng: seedNumberSchema,
      type: seedTypeValidator,
    })
    .transform(({ leagueNumber, ...seed }) => {
      const leagueId =
        leagueNumber === undefined
          ? undefined
          : leagueIdByNumber.get(leagueNumber);

      return leagueId ? { ...seed, leagueId } : seed;
    });

  const seedJsonArraySchema = z
    .array(seedJsonSchema)
    .min(1, "Import at least one seed")
    .max(MAX_SEED_IMPORT_COUNT, `Import up to ${MAX_SEED_IMPORT_COUNT} seeds`);

  return z
    .union([
      seedJsonArraySchema,
      z.strictObject({ seeds: seedJsonArraySchema }),
    ])
    .transform((value) => (Array.isArray(value) ? value : value.seeds));
}

function formatZodIssue(issue: ZodIssue) {
  const path = formatZodIssuePath(issue.path);
  return `${path}: ${issue.message}`;
}

function formatZodIssuePath(path: z.core.$ZodIssue["path"]): string {
  if (path.length === 0) {
    return "file";
  }

  return path.reduce<string>((label, segment) => {
    if (typeof segment === "number") {
      return `${label}[${segment + 1}]`;
    }

    const segmentLabel = String(segment);

    return label ? `${label}.${segmentLabel}` : segmentLabel;
  }, "");
}
