import z from "zod";

export const UpdatePlayerRolesSchema = z.object({
  users: z.array(
    z.object({
      discordId: z.string().min(1),
      roles: z.array(z.enum(["admin", "host", "tester", "uploader"])),
      homeLeagueId: z.array(z.string()),
      hostLeagueId: z.array(z.string()),
    }),
  ),
});
