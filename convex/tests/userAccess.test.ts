import { describe, expect, test } from "vitest";
import { getUserLabel } from "../../src/lib/userAccess";

describe("user label helpers", () => {
  test("getUserLabel does not fall back to email", () => {
    expect(
      getUserLabel({
        name: undefined,
        lowercaseName: undefined,
        email: "person@example.com",
      } as never),
    ).toBe("Unnamed user");
  });
});
