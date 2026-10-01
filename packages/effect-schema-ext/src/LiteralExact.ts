/**
 * Exact literal unions: a tuple of literals that is checked, at compile time,
 * to name **every** member of a union type and **nothing else**.
 *
 * The same vocabulary often lives in two places that must agree — a
 * TypeScript union and a database enum, a `Schema.Literals` and the keys of a
 * lookup map. `values satisfies ReadonlyArray<U>` catches an extra entry but
 * not a missing one; the `Exclude<U, T[number]>` / `AssertNever` pair the
 * applications write inline catches the missing one. {@link tuple} does both
 * in one call and names the missing members in the error.
 *
 * @copyright Thomas Foster
 * @since 0.1.0
 */

import * as Schema from "effect/Schema";
import type * as SchemaAST from "effect/SchemaAST";

/**
 * The members of `U` that the tuple `T` does not name — `never` when `T` is
 * exhaustive.
 *
 * @since 0.1.0
 * @category type-level
 */
export type Missing<U, T extends ReadonlyArray<unknown>> = Exclude<U, T[number]>;

/**
 * What an argument to {@link tuple} must additionally satisfy: nothing when it
 * is exhaustive, otherwise an object type whose one key names the missing
 * members — so the compile error says which ones.
 *
 * @since 0.1.0
 * @category type-level
 */
export type Exhaustive<U, T extends ReadonlyArray<unknown>> = [Missing<U, T>] extends [never]
  ? unknown
  : { readonly "missing union members": Missing<U, T> };

/**
 * Pin a literal tuple to a union: `tuple<U>()(values)` compiles only when
 * `values` names every member of `U` and nothing outside it, and returns
 * `values` unchanged, typed as the literal tuple. Curried so `U` is given
 * explicitly while the tuple's own type is inferred.
 *
 * @example
 * ```ts
 * import { LiteralExact } from "@thomasfosterau/effect-schema-ext"
 *
 * type Status = "draft" | "published" | "archived"
 *
 * const STATUSES = LiteralExact.tuple<Status>()(["draft", "published", "archived"])
 * console.log(STATUSES)
 * // → [ 'draft', 'published', 'archived' ]
 *
 * // A missing member fails to compile:
 * // LiteralExact.tuple<Status>()(["draft", "published"])
 * //   → Property '"missing union members"' is missing …
 * ```
 *
 * @since 0.1.0
 * @category constructors
 */
export const tuple =
  <U extends SchemaAST.LiteralValue>() =>
  <const T extends ReadonlyArray<U>>(values: T & Exhaustive<U, T>): T =>
    values;

/**
 * {@link tuple}, as a `Schema.Literals`: the schema's `Type` is exactly `U`,
 * and the literal list it was built from is checked to cover `U`.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { LiteralExact } from "@thomasfosterau/effect-schema-ext"
 *
 * type Status = "draft" | "published"
 *
 * const Status = LiteralExact.literals<Status>()(["draft", "published"])
 * console.log(Schema.is(Status)("draft"), Schema.is(Status)("deleted"))
 * // → true false
 * ```
 *
 * @since 0.1.0
 * @category constructors
 */
export const literals =
  <U extends SchemaAST.LiteralValue>() =>
  <const T extends ReadonlyArray<U>>(values: T & Exhaustive<U, T>): Schema.Literals<T> =>
    Schema.Literals(values);
