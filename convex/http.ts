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
import { api, internal } from "./_generated/api";
import { UpdatePlayerRolesSchema } from "./lib/validators";

type ProtectedRunResult = { ok: true; [key: string]: unknown } | never;

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
  const authError = await validateApiKey(args.request, "WRITER_API_KEY");
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
  const authError = await validateApiKey(args.request, "READER_API_KEY");
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
          api.users.listActiveUsers,
          payload as any,
        );

        return { ok: true, ...result };
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
      routeLabel: "PATCH /api/write/movements",
      run: (payload) => ctx.runMutation(internal.users.updateAllUsers, payload),
    }),
  ),
});

export default http;
