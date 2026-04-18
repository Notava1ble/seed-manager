import { z, type ZodIssue } from "zod";
import {
  MAX_SEED_IMPORT_COUNT,
  type SeedJsonUploadInput,
} from "./seedFormUtils";
import {
  seedTypeValidator,
  seedValueValidator as seedNumberSchema,
} from "./validators";

type SeedJsonParseResult =
  | { success: true; seeds: SeedJsonUploadInput[] }
  | { success: false; errors: string[] };

export async function parseSeedJsonImportFile(
  file: File,
): Promise<SeedJsonParseResult> {
  return parseSeedJsonImportText(await file.text());
}

export function parseSeedJsonImportText(text: string): SeedJsonParseResult {
  const parsedJsonl = parseJsonlLines(text);

  if (!parsedJsonl.success) {
    return { success: false, errors: parsedJsonl.errors };
  }

  const result = seedJsonlRootSchema.safeParse(parsedJsonl.values);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) =>
        formatZodIssue(issue, parsedJsonl.lineNumbers),
      ),
    };
  }

  return {
    success: true,
    seeds: result.data,
  };
}

const seedJsonlLineSchema = z
  .object({
    overworld: z.object({
      seed: seedNumberSchema,
      structure: seedTypeValidator,
    }),
    nether: z.object({
      seed: seedNumberSchema,
    }),
    theEnd: z.object({
      seed: seedNumberSchema,
    }),
    rng: z.object({
      seed: seedNumberSchema,
    }),
  })
  .transform(({ overworld, nether, theEnd, rng }) => ({
    overworld: overworld.seed,
    nether: nether.seed,
    end: theEnd.seed,
    rng: rng.seed,
    type: overworld.structure,
  }));

const seedJsonlRootSchema = z
  .array(seedJsonlLineSchema)
  .min(1, "Import at least one seed")
  .max(MAX_SEED_IMPORT_COUNT, `Import up to ${MAX_SEED_IMPORT_COUNT} seeds`);

function parseJsonlLines(text: string):
  | { success: true; values: unknown[]; lineNumbers: number[] }
  | { success: false; errors: string[] } {
  const values: unknown[] = [];
  const lineNumbers: number[] = [];
  const errors: string[] = [];

  text.split(/\r?\n/).forEach((line, index) => {
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0) {
      return;
    }

    try {
      values.push(JSON.parse(trimmedLine) as unknown);
      lineNumbers.push(index + 1);
    } catch {
      errors.push(`line ${index + 1}: Line must contain valid JSON`);
    }
  });

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, values, lineNumbers };
}

function formatZodIssue(issue: ZodIssue, lineNumbers: number[]) {
  const path = formatZodIssuePath(issue.path, lineNumbers);
  return `${path}: ${issue.message}`;
}

function formatZodIssuePath(
  path: z.core.$ZodIssue["path"],
  lineNumbers: number[],
): string {
  if (path.length === 0) {
    return "file";
  }

  return path.reduce<string>((label, segment, index) => {
    if (typeof segment === "number") {
      if (index === 0 && lineNumbers[segment] !== undefined) {
        return `line ${lineNumbers[segment]}`;
      }

      return `${label}[${segment + 1}]`;
    }

    const segmentLabel = String(segment);

    return label ? `${label}.${segmentLabel}` : segmentLabel;
  }, "");
}
