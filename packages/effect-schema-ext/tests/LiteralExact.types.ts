/**
 * @copyright Thomas Foster
 *
 * Type-level tests for `LiteralExact`: a tuple compiles only when it names
 * every member of the union and nothing else, and its type is the literal
 * tuple. Checked by the package's `check` task (tsconfig.test.json); the
 * expect-error directives are the assertions. Never executed.
 *
 * @module tests/LiteralExact.types
 */

import type * as Schema from "effect/Schema";
import { LiteralExact } from "@thomasfosterau/effect-schema-ext";

type Assert<T extends true> = T;
type Equals<A, B> =
  (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2 ? true : false;

type Status = "draft" | "published" | "archived";

export const exact = LiteralExact.tuple<Status>()(["draft", "published", "archived"]);
export const reordered = LiteralExact.tuple<Status>()(["archived", "draft", "published"]);

// @ts-expect-error -- "archived" is missing
export const missing = LiteralExact.tuple<Status>()(["draft", "published"]);

// @ts-expect-error -- "deleted" is not a Status
export const extra = LiteralExact.tuple<Status>()(["draft", "published", "archived", "deleted"]);

// @ts-expect-error -- the empty tuple names nothing
export const empty = LiteralExact.tuple<Status>()([]);

export const schema = LiteralExact.literals<Status>()(["draft", "published", "archived"]);

// @ts-expect-error -- the schema form checks exhaustiveness too
export const schemaMissing = LiteralExact.literals<Status>()(["draft"]);

export type Checks = [
  Assert<Equals<typeof exact, readonly ["draft", "published", "archived"]>>,
  Assert<Equals<(typeof exact)[number], Status>>,
  Assert<Equals<typeof schema.Type, Status>>,
  Assert<Equals<typeof schema, Schema.Literals<readonly ["draft", "published", "archived"]>>>,
  Assert<Equals<LiteralExact.Missing<Status, readonly ["draft"]>, "published" | "archived">>,
  Assert<Equals<LiteralExact.Missing<Status, typeof exact>, never>>,
];
