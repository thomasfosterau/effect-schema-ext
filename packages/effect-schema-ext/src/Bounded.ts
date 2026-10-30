/**
 * Bounded numeric and list schemas for list inputs.
 *
 * A list endpoint that takes its window from the caller must bound it in the
 * **schema**, so an over-large `limit`, a negative `offset` or an unbounded id
 * list is a decode-time 400 rather than something every list operation has to
 * defend against — a hostile request can never drive an unbounded SQL `LIMIT`
 * or `IN (…)`. One declaration per bound, shared by every list input, means
 * the bound cannot drift between them.
 *
 * **The cap is always the caller's.** There is no default page cap: every
 * `limit` schema is built from an explicit `maxLimit` (website and gardeneria
 * cap at 1000, preferenceflow at 100).
 *
 * The overlapping exports (`PageOffset`, `pageLimit`, `pagination`,
 * `PaginationOptions`, `DefaultedPagination`, `RequiredPagination`, `idList`,
 * `IdList`, `DEFAULT_MAX_ID_LIST`) keep the names, signatures and behaviour of
 * effect-jsonapi's `FlatQuery`, whose interim copies move here, so that move
 * is an import change, not an API change.
 *
 * @copyright Thomas Foster
 * @since 0.1.0
 */

import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";
import { Uuid } from "./Ids.ts";

/**
 * A non-negative finite number. **Zero is allowed** (a track 0 pregap, an
 * empty booth, an episode 0 trailer); only negatives are rejected. The
 * `isGreaterThanOrEqualTo(0)` check is the single statement of the rule, so a
 * schema-derived database CHECK constraint can be read off it too.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Bounded } from "@thomasfosterau/effect-schema-ext"
 *
 * console.log(Schema.is(Bounded.NonNegative)(0), Schema.is(Bounded.NonNegative)(-1))
 * // → true false
 * ```
 *
 * @since 0.1.0
 * @category schemas
 */
export const NonNegative: Schema.Finite = Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0));

/**
 * The decoded type of {@link NonNegative}.
 *
 * @since 0.1.0
 * @category models
 */
export type NonNegative = typeof NonNegative.Type;

/**
 * The page size {@link pagination} decodes when the caller names none and
 * passes no `defaultLimit`.
 *
 * @since 0.1.0
 * @category constants
 */
export const DEFAULT_PAGE_LIMIT = 50;

/**
 * A pagination `limit` bounded by `maxLimit`: a positive integer no greater
 * than it. `isInt` also rejects `NaN` and `±Infinity`.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Bounded } from "@thomasfosterau/effect-schema-ext"
 *
 * const Limit = Bounded.pageLimit(100)
 * console.log(Schema.is(Limit)(100), Schema.is(Limit)(101), Schema.is(Limit)(0), Schema.is(Limit)(2.5))
 * // → true false false false
 * ```
 *
 * @since 0.1.0
 * @category constructors
 */
export const pageLimit = (maxLimit: number): Schema.Number =>
  Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThan(0),
    Schema.isLessThanOrEqualTo(maxLimit),
  );

/**
 * A pagination `offset`: a non-negative integer.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Bounded } from "@thomasfosterau/effect-schema-ext"
 *
 * console.log(Schema.is(Bounded.PageOffset)(0), Schema.is(Bounded.PageOffset)(-1), Schema.is(Bounded.PageOffset)(0.5))
 * // → true false false
 * ```
 *
 * @since 0.1.0
 * @category schemas
 */
export const PageOffset: Schema.Number = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
);

/**
 * The decoded type of {@link PageOffset}.
 *
 * @since 0.1.0
 * @category models
 */
export type PageOffset = typeof PageOffset.Type;

/**
 * Options of {@link pagination}.
 *
 * @since 0.1.0
 * @category models
 */
export interface PaginationOptions {
  /** The most rows one page may ask for. Required: the cap is the caller's. */
  readonly maxLimit: number;
  /**
   * The page size decoded when the caller names none. Defaults to
   * {@link DEFAULT_PAGE_LIMIT}. Pass `false` to make both keys **required**
   * instead (no defaults) — for a contract whose every list request must
   * spell its window.
   */
  readonly defaultLimit?: number | false | undefined;
}

/**
 * The page-cursor fields with decoding defaults: `offset` and `limit`
 * concrete once decoded whether or not the caller sent them.
 *
 * @since 0.1.0
 * @category models
 */
// A type alias, not an interface: `Schema.Struct` takes a `Fields` index
// signature, which an interface does not satisfy.
export type DefaultedPagination = {
  readonly offset: Schema.withDecodingDefaultKey<Schema.Number>;
  readonly limit: Schema.withDecodingDefaultKey<Schema.Number>;
};

/**
 * The page-cursor fields with no defaults: both keys required.
 *
 * @since 0.1.0
 * @category models
 */
export type RequiredPagination = {
  readonly offset: Schema.Number;
  readonly limit: Schema.Number;
};

/**
 * The overloads of {@link pagination}.
 */
interface Pagination {
  (options: PaginationOptions & { readonly defaultLimit: false }): RequiredPagination;
  (options: PaginationOptions): DefaultedPagination;
}

const makePagination = (options: PaginationOptions): DefaultedPagination | RequiredPagination => {
  const limit = pageLimit(options.maxLimit);
  if (options.defaultLimit === false) return { offset: PageOffset, limit };
  return {
    offset: PageOffset.pipe(Schema.withDecodingDefaultKey(Effect.succeed(0))),
    limit: limit.pipe(
      Schema.withDecodingDefaultKey(Effect.succeed(options.defaultLimit ?? DEFAULT_PAGE_LIMIT)),
    ),
  };
};

/**
 * The `{ offset, limit }` fields of a list input, bounded by `maxLimit`. With
 * a `defaultLimit` (the default, {@link DEFAULT_PAGE_LIMIT}) both keys are
 * optional on input and concrete once decoded (`offset` defaults to `0`), so
 * a list operation can apply its window unconditionally; with
 * `defaultLimit: false` both are required (website and gardeneria's
 * `ListInput`, whose bracket-paginated wire query always carries both keys).
 * Spread them into the list input's `Schema.Struct` beside its own filters.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Bounded } from "@thomasfosterau/effect-schema-ext"
 *
 * const ListPeople = Schema.Struct({
 *   ...Bounded.pagination({ maxLimit: 100 }),
 *   q: Schema.optionalKey(Schema.String)
 * })
 * console.log(Schema.decodeUnknownSync(ListPeople)({}))
 * // → { offset: 0, limit: 50 }
 * console.log(Schema.decodeUnknownSync(ListPeople)({ limit: 10, offset: 20, q: "x" }))
 * // → { offset: 20, limit: 10, q: 'x' }
 *
 * const ListStrict = Schema.Struct(Bounded.pagination({ maxLimit: 1000, defaultLimit: false }))
 * console.log(Schema.decodeUnknownOption(ListStrict)({})._tag)
 * // → None
 * ```
 *
 * @since 0.1.0
 * @category constructors
 */
// SAFETY: `makePagination` returns `RequiredPagination` exactly when
// `defaultLimit` is `false`, which is what the overloads state.
export const pagination: Pagination = makePagination as Pagination;

/**
 * The most ids {@link idList} admits by default.
 *
 * @since 0.1.0
 * @category constants
 */
export const DEFAULT_MAX_ID_LIST = 100;

/**
 * Options of {@link idList}.
 *
 * @since 0.1.0
 * @category models
 */
export interface IdListOptions {
  /** The most ids one list may carry, as sent. Defaults to {@link DEFAULT_MAX_ID_LIST}. */
  readonly maxLength?: number | undefined;
  /**
   * Whether the decoded list drops repeated ids (first occurrence wins, order
   * kept). Defaults to `false`: the decoded list is exactly the list sent and
   * re-encodes to the same wire value. The bound applies to the list as sent
   * either way, so repeats cannot pad a request past it.
   */
  readonly dedupe?: boolean | undefined;
}

/**
 * The codec {@link idList} returns: decoded, a non-empty list of UUID
 * strings; encoded, the comma-separated string (or, on decode, the
 * repeated-key array).
 *
 * @since 0.1.0
 * @category models
 */
export type IdListCodec = Schema.Codec<ReadonlyArray<string>, string | ReadonlyArray<string>>;

const joinRepeated = SchemaTransformation.transform<string, string | ReadonlyArray<string>>({
  decode: (value) => (Predicate.isString(value) ? value : value.join(",")),
  encode: (value) => value,
});

const splitCommas = SchemaTransformation.transform<ReadonlyArray<string>, string>({
  decode: (value) => value.split(","),
  encode: (value) => value.join(","),
});

const dedupeIds = SchemaTransformation.transform<ReadonlyArray<string>, ReadonlyArray<string>>({
  decode: (value) => Array.dedupe(value),
  encode: (value) => value,
});

/**
 * A comma-separated list of UUIDs, as a query value carries it
 * (`?filter[ids]=<uuid>,<uuid>`), decoded to a non-empty list of at most
 * `maxLength` — the shape a family resolving a bounded, caller-known id set (a
 * byline, a gallery) uses to load them in one round trip.
 *
 * Both query encodings decode: a key seen once arrives as a string, a
 * repeated key as an array (`UrlParams.toRecord`), and the array is joined
 * before it is split. With `dedupe: true` repeated ids are dropped after the
 * bound is checked.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Bounded } from "@thomasfosterau/effect-schema-ext"
 *
 * const a = "5f0c3f9a-8a18-4f6e-9b2e-7a8a1b2c3d4e"
 * const b = "7d1e4c2b-3a5f-4b8c-9d0e-1f2a3b4c5d6e"
 *
 * console.log(Schema.decodeUnknownSync(Bounded.idList({ maxLength: 3 }))(`${a},${b},${a}`).length)
 * // → 3
 * console.log(Schema.decodeUnknownSync(Bounded.idList({ maxLength: 3, dedupe: true }))(`${a},${b},${a}`).length)
 * // → 2
 * console.log(Schema.decodeUnknownOption(Bounded.IdList)("")._tag)
 * // → None
 * ```
 *
 * @since 0.1.0
 * @category constructors
 */
export const idList = (options?: IdListOptions): IdListCodec => {
  const bounded = Schema.Array(Uuid).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(options?.maxLength ?? DEFAULT_MAX_ID_LIST),
  );
  const parsed = Schema.Union([Schema.String, Schema.Array(Schema.String)]).pipe(
    Schema.decodeTo(Schema.String, joinRepeated),
    Schema.decodeTo(bounded, splitCommas),
  );
  return options?.dedupe === true ? parsed.pipe(Schema.decodeTo(bounded, dedupeIds)) : parsed;
};

/**
 * {@link idList} at its defaults: at most {@link DEFAULT_MAX_ID_LIST} ids,
 * repeats kept.
 *
 * @since 0.1.0
 * @category schemas
 */
export const IdList: IdListCodec = idList();

/**
 * The decoded type of {@link IdList}.
 *
 * @since 0.1.0
 * @category models
 */
export type IdList = typeof IdList.Type;
