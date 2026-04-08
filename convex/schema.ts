import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    lowercaseName: v.optional(v.string()),
    image: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("deleted"),
      v.literal("banned"),
    ),
  })
    .index("email", ["email"])
    .index("lowercase_name", ["lowercaseName"]),
  numbers: defineTable({
    value: v.number(),
  }),
});
