/**
 * @copyright Thomas Foster
 *
 * A consumer of the EMITTED declarations (`packages/effect-schema-ext/dist`),
 * resolved through the package's `exports` exactly as an npm install would.
 * Every `Equals<…>` assertion fails if a declaration degrades on emit — a
 * brand that emits as `string`, a codec whose `Type` emits as `unknown`, a
 * reader whose signature emits as `any` (an unresolved name in a `.d.ts` is
 * the error type under `skipLibCheck`). Type-checked by `vp run check`; never
 * executed.
 *
 * @module dist-consumer
 */

import * as Option from "effect/Option";
import type * as Schema from "effect/Schema";
import type * as SchemaIssue from "effect/SchemaIssue";
import {
  Ast,
  Bounded,
  Ids,
  Issues,
  LiteralExact,
  TriState,
} from "@thomasfosterau/effect-schema-ext";
import * as TriStateEntry from "@thomasfosterau/effect-schema-ext/TriState";
import * as BoundedEntry from "@thomasfosterau/effect-schema-ext/Bounded";

type Assert<T extends true> = T;
type Equals<A, B> =
  (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2 ? true : false;
type Not<T extends boolean> = T extends true ? false : true;
type IsAny<T> = 0 extends 1 & T ? true : false;

// ── Ids ────────────────────────────────────────────────────────────────
const PersonId = Ids.make("PersonId");
const AgentPersonId = Ids.refine(Ids.make("AgentId"), "PersonId");
type PersonId = typeof PersonId.Type;

declare const raw: string;
// @ts-expect-error -- the brand survives declaration emit
export const rawAsPerson: PersonId = raw;

// ── TriState ───────────────────────────────────────────────────────────
const summary = TriState.clearable(Ids.Slug);
const Update = { summary, birthPlaceId: TriState.clearableNullOr(PersonId) };

// ── Bounded ────────────────────────────────────────────────────────────
const pagination = Bounded.pagination({ maxLimit: 100 });
const strictPagination = Bounded.pagination({ maxLimit: 100, defaultLimit: false });
// @ts-expect-error -- `maxLimit` stays required through declaration emit
export const uncapped = Bounded.pagination({});
// @ts-expect-error -- the Option guard survives declaration emit
export const misread = TriState.readNullOr(Option.none<string>());

// ── LiteralExact ───────────────────────────────────────────────────────
const statuses = LiteralExact.tuple<"a" | "b">()(["a", "b"]);
// @ts-expect-error -- the exhaustiveness check survives declaration emit
export const partial = LiteralExact.tuple<"a" | "b">()(["a"]);

export type Checks = [
  // Ids
  Assert<Not<Equals<PersonId, string>>>,
  Assert<Equals<typeof PersonId.Encoded, string>>,
  Assert<Not<Equals<typeof AgentPersonId.Type, string>>>,
  Assert<Equals<typeof Ids.Uuid.Type, string>>,
  Assert<Equals<ReturnType<typeof Ids.slug>, Schema.String>>,
  // TriState
  Assert<Equals<typeof summary, Schema.optionalKey<Schema.OptionFromNullOr<Schema.String>>>>,
  Assert<Equals<typeof Update.birthPlaceId.Type, PersonId | null | undefined>>,
  Assert<Equals<ReturnType<typeof TriState.suppliedValue<number>>, Option.Option<number>>>,
  Assert<Equals<ReturnType<typeof TriState.read<number>>, TriState.TriState<number>>>,
  Assert<Equals<ReturnType<typeof TriState.toNullOr<number>>, number | null | undefined>>,
  Assert<Equals<typeof TriStateEntry.suppliedValue, typeof TriState.suppliedValue>>,
  // Bounded
  Assert<Equals<typeof Bounded.IdList.Type, ReadonlyArray<string>>>,
  Assert<Equals<typeof Bounded.IdList.Encoded, string | ReadonlyArray<string>>>,
  Assert<Equals<typeof pagination.limit.Type, number>>,
  Assert<Equals<typeof BoundedEntry.PageOffset, typeof Bounded.PageOffset>>,
  Assert<Equals<typeof strictPagination, Bounded.RequiredPagination>>,
  Assert<
    Equals<
      ReturnType<typeof TriState.toNullOrFields<{ readonly a: Option.Option<string> }>>,
      { readonly a: string | null }
    >
  >,
  // Issues
  Assert<Equals<Parameters<typeof Issues.leaves>[0], SchemaIssue.Issue>>,
  Assert<Equals<ReturnType<typeof Issues.pathToJsonPointer>, string>>,
  Assert<Equals<Issues.PointedIssue["pointer"], string>>,
  // LiteralExact
  Assert<Equals<typeof statuses, readonly ["a", "b"]>>,
  // Ast
  Assert<Equals<ReturnType<typeof Ast.fieldTraits>, ReadonlyArray<Ast.FieldTraits>>>,
  // Nothing degraded to `any`
  Assert<Not<IsAny<typeof TriState.read>>>,
  Assert<Not<IsAny<typeof Issues.pointers>>>,
  Assert<Not<IsAny<typeof Bounded.idList>>>,
];
