import z from "zod";

export const UpdatePlayerRolesSchema = z.object({
  users: z.array(
    z.object({
      discordId: z.string().min(1),
      roles: z.array(z.enum(["admin", "host", "uploader"])),
      uploaderLeagueNumbers: z.array(z.number()).optional(),
      hostLeagueNumbers: z.array(z.number()).optional(),
    }),
  ),
});
