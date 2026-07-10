import { httpRouter } from "convex/server";
import { ConvexError } from "convex/values";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import {
  extractRequestBody,
  jsonError,
  jsonResponse,
  validateApiKey,
} from "./lib/utils";
import z from "zod";
import { internal } from "./_generated/api";
import { AdvanceWeekSchema, UpdatePlayerRolesSchema } from "./lib/validators";

type ProtectedRunResult = { ok: true; [key: string]: unknown };

type RouteResult =
  | { ok: true; [key: string]: unknown }
  | { ok: false; status: number; error: string };

async function runProtectedJsonRoute<T>(args: {
  request: Request;
  schema: z.ZodType<T>;
  routeLabel: string;
  run: (payload: T) => Promise<ProtectedRunResult>;
  successStatus?: number;
}) {
  const authError = await validateApiKey(args.request, "WRITE_API_KEY_SEEDS");
  if (authError) return authError;

  const bodyResult = await extractRequestBody(args.request, args.schema);
  if ("errorResponse" in bodyResult) return bodyResult.errorResponse;

  try {
    const result = await args.run(bodyResult.data);

    console.info(`[${args.routeLabel}] Success`, result);
    return jsonResponse(result, args.successStatus ?? 200);
  } catch (error) {
    if (error instanceof ConvexError) {
      const message =
        typeof error.data === "string"
          ? error.data
          : error.message || "Request failed.";

      return jsonError(message, 400);
    }

    console.error(`[${args.routeLabel}] Unhandled error`, error);
    return jsonError("Internal server error.", 500);
  }
}

async function runReadRoute(args: {
  request: Request;
  routeLabel: string;
  run: (payload: Record<string, string>) => Promise<RouteResult>;
}) {
  const authError = await validateApiKey(args.request, "READ_API_KEY_SEEDS");
  if (authError) return authError;

  const payload = Object.fromEntries(
    new URL(args.request.url).searchParams.entries(),
  );

  try {
    const result = await args.run(payload);

    if (result.ok === false) {
      return jsonError(result.error, result.status);
    }

    console.info(`[${args.routeLabel}] Success`, result);
    return jsonResponse(result);
  } catch (error) {
    console.error(`[${args.routeLabel}] Unhandled error`, error);
    return jsonError("Internal server error.", 500);
  }
}

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/api/users/discord",
  method: "GET",
  handler: httpAction(async (ctx, request) =>
    runReadRoute({
      request,
      routeLabel: "GET /api/users/discord",
      run: async (payload) => {
        const result = await ctx.runQuery(
          internal.users.listActiveUsersAPI,
          payload as any,
        );
        return { ok: true, result };
      },
    }),
  ),
});

http.route({
  path: "/api/users/discord/roles/update",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    runProtectedJsonRoute({
      request,
      schema: UpdatePlayerRolesSchema,
      routeLabel: "POST /api/users/discord/roles/update",
      run: (payload) =>
        ctx.runMutation(internal.users.updateDiscordRole, payload),
    }),
  ),
});

http.route({
  path: "/api/week/advance",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    runProtectedJsonRoute({
      request,
      schema: AdvanceWeekSchema,
      routeLabel: "POST /api/week/advance",
      run: async () => {
        const result = await ctx.runMutation(
          internal.settings.advanceWeekInternal,
          {},
        );
        return { ok: true, ...result };
      },
    }),
  ),
});

export default http;
