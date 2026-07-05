import { describe, expect, test } from "vitest";
import { getCommentAuthorName } from "../comments";

describe("comment author labels", () => {
  test("do not fall back to email", () => {
    expect(
      getCommentAuthorName({
        name: undefined,
        lowercaseName: undefined,
        email: "author@example.com",
      } as never),
    ).toBe("Unknown user");
  });
});
