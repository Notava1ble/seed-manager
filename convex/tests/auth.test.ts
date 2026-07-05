import { describe, expect, test } from "vitest";
import {
  createPendingDiscordUser,
  getDiscordUserFields,
  updateUserFromDiscordProfile,
} from "../lib/authUsers";
import { createActor, createTest } from "./test.helpers";

describe("auth", () => {
  test("discord sign-in creates users without storing email", async () => {
    const t = createTest();

    const profile = {
      discordId: "123456789012345678",
      username: "Seed Tester",
      name: "Seed Tester",
      email: "tester@example.com",
      image: "https://cdn.example.com/avatar.png",
    };

    const userFields = getDiscordUserFields(profile);
    expect(userFields).not.toHaveProperty("email");

    const userId = await t.run(async (ctx) => {
      return await createPendingDiscordUser(ctx, profile);
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db.get("users", userId);
    });

    expect(user).toMatchObject({
      discordId: profile.discordId,
      name: profile.username,
      lowercaseName: profile.username.toLowerCase(),
      image: profile.image,
      status: "pending",
    });
    expect(user?.email).toBeUndefined();
  });

  test("discord profile updates do not overwrite existing email values", async () => {
    const t = createTest();
    const { userId } = await createActor(t, { status: "pending" });

    await t.run(async (ctx) => {
      await ctx.db.patch("users", userId, {
        email: "legacy@example.com",
        discordId: "111111111111111111",
        name: "Old Name",
        lowercaseName: "old name",
        image: "https://cdn.example.com/old.png",
      });
    });

    await t.run(async (ctx) => {
      return await updateUserFromDiscordProfile(ctx, userId, {
        discordId: "222222222222222222",
        username: "New Name",
        name: "New Name",
        email: "new@example.com",
        image: "https://cdn.example.com/new.png",
      });
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db.get("users", userId);
    });

    expect(user).toMatchObject({
      discordId: "222222222222222222",
      name: "New Name",
      lowercaseName: "new name",
      image: "https://cdn.example.com/new.png",
      email: "legacy@example.com",
    });
  });
});
