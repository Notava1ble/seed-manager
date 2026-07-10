import z from "zod";

export const UpdatePlayerRolesSchema = z.object({
  discordId: z.string().trim().min(1),
  role: z.enum(["host", "uploader"]),
  leagueNumber: z.number().int().positive(),
  operation: z.enum(["add", "remove"]),
});

export const AdvanceWeekSchema = z.object({}).strict();
