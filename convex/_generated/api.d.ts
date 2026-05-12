/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analysis_anomaly from "../analysis/anomaly.js";
import type * as analysis_duplicates from "../analysis/duplicates.js";
import type * as anomalies from "../anomalies.js";
import type * as duplicates from "../duplicates.js";
import type * as journalLines from "../journalLines.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "analysis/anomaly": typeof analysis_anomaly;
  "analysis/duplicates": typeof analysis_duplicates;
  anomalies: typeof anomalies;
  duplicates: typeof duplicates;
  journalLines: typeof journalLines;
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
