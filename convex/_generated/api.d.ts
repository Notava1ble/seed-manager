/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as comments from "../comments.js";
import type * as http from "../http.js";
import type * as leagues from "../leagues.js";
import type * as lib_consts from "../lib/consts.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_settings from "../lib/settings.js";
import type * as lib_utils from "../lib/utils.js";
import type * as lib_validators from "../lib/validators.js";
import type * as migration from "../migration.js";
import type * as seeds from "../seeds.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  comments: typeof comments;
  http: typeof http;
  leagues: typeof leagues;
  "lib/consts": typeof lib_consts;
  "lib/permissions": typeof lib_permissions;
  "lib/settings": typeof lib_settings;
  "lib/utils": typeof lib_utils;
  "lib/validators": typeof lib_validators;
  migration: typeof migration;
  seeds: typeof seeds;
  settings: typeof settings;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
