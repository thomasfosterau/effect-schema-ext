/**
 * @copyright Thomas Foster
 *
 * Bounded numeric and list schemas for list inputs.
 *
 * A list endpoint that takes its window from the caller must bound it in the
 * **schema**, so an over-large `limit`, a negative `offset` or an unbounded id
 * list is a decode-time 400 rather than something every list operation has to
 * defend against — a hostile request can never drive an unbounded SQL `LIMIT`
 * or `IN (…)`. One declaration per bound, shared by every list input, means
 * the bound cannot drift between them.
 *
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
 * The largest page {@link PageLimit} admits.
 *
 * @since 0.1.0
 * @category constants
 */
export const MAX_PAGE_LIMIT = 1000;

/**
 * The page size {@link pagination} decodes when the caller names none.
 *
 * @since 0.1.0
 * @category constants
 */
export const DEFAULT_PAGE_LIMIT = 50;

/**
 * A pagination `limit` bounded by `maxLimit`: a positive integer no greater
 * than it.
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
export const pageLimit = (maxLimit: number): Schema.Int =>
  Schema.Int.check(Schema.isGreaterThan(0), Schema.isLessThanOrEqualTo(maxLimit));

/**
 * A pagination `limit` bounded by {@link MAX_PAGE_LIMIT}.
 *
 * @since 0.1.0
 * @category schemas
 */
export const PageLimit: Schema.Int = pageLimit(MAX_PAGE_LIMIT);

/**
 * The decoded type of {@link PageLimit}.
 *
 * @since 0.1.0
 * @category models
 */
export type PageLimit = typeof PageLimit.Type;

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
export const PageOffset: Schema.Int = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

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
  /** The most rows one page may ask for. Defaults to {@link MAX_PAGE_LIMIT}. */
  readonly maxLimit?: number | undefined;
  /** The page size decoded when the caller names none. Defaults to {@link DEFAULT_PAGE_LIMIT}. */
  readonly defaultLimit?: number | undefined;
}

/**
 * The fields {@link pagination} returns.
 *
 * @since 0.1.0
 * @category models
 */
// A type alias, not an interface: `Schema.Struct` takes a `Fields` index
// signature, which an interface does not satisfy.
export type PaginationFields = {
  readonly limit: Schema.withDecodingDefaultKey<Schema.Int>;
  readonly offset: Schema.withDecodingDefaultKey<Schema.Int>;
};

/**
 * The `{ limit, offset }` fields of a list input: optional on input, concrete
 * once decoded (`limit` defaults to `defaultLimit`, `offset` to `0`), so a
 * list operation can apply its window unconditionally. Spread them into the
 * list input's `Schema.Struct` beside its own filters.
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
 * // → { limit: 50, offset: 0 }
 * console.log(Schema.decodeUnknownSync(ListPeople)({ limit: 10, offset: 20, q: "x" }))
 * // → { limit: 10, offset: 20, q: 'x' }
 * ```
 *
 * @since 0.1.0
 * @category constructors
 */
export const pagination = (options?: PaginationOptions): PaginationFields => ({
  limit: pageLimit(options?.maxLimit ?? MAX_PAGE_LIMIT).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(options?.defaultLimit ?? DEFAULT_PAGE_LIMIT)),
  ),
  offset: PageOffset.pipe(Schema.withDecodingDefaultKey(Effect.succeed(0))),
});

/**
 * The most ids {@link IdList} admits.
 *
 * @since 0.1.0
 * @category constants
 */
export const MAX_ID_LIST = 100;

/**
 * Options of {@link idList}.
 *
 * @since 0.1.0
 * @category models
 */
export interface IdListOptions {
  /** The most ids one list may carry, counted before de-duplication. Defaults to {@link MAX_ID_LIST}. */
  readonly maxLength?: number | undefined;
  /**
   * Whether the decoded list drops repeated ids (first occurrence wins, order
   * kept). Defaults to `true`; with `false` the decoded list re-encodes to
   * exactly the wire value it came from.
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
export type IdListCodec = Schema.Codec<
  ReadonlyArray<string>,
  string | ReadonlyArray<string>,
  never,
  never
>;

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
 * before it is split. The bound applies to the list **as sent**, so a hostile
 * request cannot pad it with repeats; repeats are then dropped (see
 * {@link IdListOptions.dedupe}).
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Bounded } from "@thomasfosterau/effect-schema-ext"
 *
 * const a = "5f0c3f9a-8a18-4f6e-9b2e-7a8a1b2c3d4e"
 * const b = "7d1e4c2b-3a5f-4b8c-9d0e-1f2a3b4c5d6e"
 * const ids = Bounded.idList({ maxLength: 3 })
 *
 * console.log(Schema.decodeUnknownSync(ids)(`${a},${b},${a}`).length)
 * // → 2
 * console.log(Schema.decodeUnknownOption(ids)("")._tag, Schema.decodeUnknownOption(ids)(`${a},${a},${a},${a}`)._tag)
 * // → None None
 * ```
 *
 * @since 0.1.0
 * @category constructors
 */
export const idList = (options?: IdListOptions): IdListCodec => {
  const bounded = Schema.Array(Uuid).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(options?.maxLength ?? MAX_ID_LIST),
  );
  const parsed = Schema.Union([Schema.String, Schema.Array(Schema.String)]).pipe(
    Schema.decodeTo(Schema.String, joinRepeated),
    Schema.decodeTo(bounded, splitCommas),
  );
  return options?.dedupe === false ? parsed : parsed.pipe(Schema.decodeTo(bounded, dedupeIds));
};

/**
 * {@link idList} at its defaults: at most {@link MAX_ID_LIST} ids, repeats
 * dropped.
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
