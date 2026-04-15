import { query } from "./_generated/server";
import { requireAdmin } from "./lib/permissions";

export const listAllSeeds = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allSeeds = ctx.db.query("seeds").collect();
    return allSeeds;
  },
});
