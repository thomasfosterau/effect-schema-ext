/**
 * @copyright Thomas Foster
 *
 * The **update tri-state**: how a partial-update input says, per clearable
 * field, one of three things.
 *
 * | Wire        | Meaning                        |
 * | ----------- | ------------------------------ |
 * | key absent  | carry the stored value forward |
 * | `null`      | clear the column               |
 * | a value     | set the column                 |
 *
 * The applications decode it in one of two encodings, and this module serves
 * both:
 *
 * | Field schema                                      | Decoded: absent | `null`          | value            |
 * | ------------------------------------------------- | --------------- | --------------- | ---------------- |
 * | {@link clearable} — `optionalKey(OptionFromNullOr(X))` | key absent      | `Option.none()` | `Option.some(v)` |
 * | {@link clearableNullOr} — `optional(NullOr(X))`        | key absent      | `null`          | `v`              |
 *
 * In the first, key presence is the outer half and the `Option` the inner
 * one. That is why the combinator is never `Schema.OptionFromOptionalNullOr`,
 * which collapses the first two rows into a single `Option.none()` on a
 * required key and turns every omitted field into a clear.
 *
 * **The hazard every reader here guards against** is folding "carry forward"
 * into "clear": `col: input.col ?? null` on a write path is silent data loss
 * (website #1877). {@link read} / {@link readNullOr} keep the three states
 * apart as a {@link TriState}; {@link toNullOr} converts the `Option` encoding
 * to the nullable one a SQL `SET` map takes without folding them;
 * {@link suppliedValue} / {@link suppliedNullOr} fold the two no-value states
 * together on purpose, and are for side effects only.
 *
 * @since 0.1.0
 */

import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

// ---------------------------------------------------------------------------
// Field schemas
// ---------------------------------------------------------------------------

/**
 * A clearable update field in the `Option` encoding:
 * `Schema.optionalKey(Schema.OptionFromNullOr(schema))`. An absent key stays
 * absent, `null` decodes to `Option.none()`, a value to `Option.some(value)`;
 * encoding reproduces the wire exactly.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { TriState } from "@thomasfosterau/effect-schema-ext"
 *
 * const UpdateNote = Schema.Struct({ summary: TriState.clearable(Schema.String) })
 * const decode = Schema.decodeUnknownSync(UpdateNote)
 *
 * console.log(decode({}))
 * // → {}
 * console.log(decode({ summary: null }))
 * // → { summary: { _id: 'Option', _tag: 'None' } }
 * console.log(decode({ summary: "Next" }))
 * // → { summary: { _id: 'Option', _tag: 'Some', value: 'Next' } }
 * ```
 *
 * @since 0.1.0
 * @category schemas
 */
export const clearable = <S extends Schema.Constraint>(
  schema: S,
): Schema.optionalKey<Schema.OptionFromNullOr<S>> =>
  Schema.optionalKey(Schema.OptionFromNullOr(schema));

/**
 * A clearable update field in the nullable encoding:
 * `Schema.optional(Schema.NullOr(schema))`. An absent key (or an explicit
 * `undefined`) carries forward, `null` clears, a value sets — the shape a
 * SQL `SET` map built from the input's own keys consumes directly.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { TriState } from "@thomasfosterau/effect-schema-ext"
 *
 * const UpdatePerson = Schema.Struct({ birthPlaceId: TriState.clearableNullOr(Schema.String) })
 * const decode = Schema.decodeUnknownSync(UpdatePerson)
 *
 * console.log(decode({}), decode({ birthPlaceId: null }), decode({ birthPlaceId: "x" }))
 * // → {} { birthPlaceId: null } { birthPlaceId: 'x' }
 * ```
 *
 * @since 0.1.0
 * @category schemas
 */
export const clearableNullOr = <S extends Schema.Constraint>(
  schema: S,
): Schema.optional<Schema.NullOr<S>> => Schema.optional(Schema.NullOr(schema));

// ---------------------------------------------------------------------------
// The three states
// ---------------------------------------------------------------------------

/**
 * The field was not supplied: the stored value carries forward.
 *
 * @since 0.1.0
 * @category models
 */
export interface CarryForward {
  readonly _tag: "CarryForward";
}

/**
 * The field was supplied as `null`: the stored value is cleared.
 *
 * @since 0.1.0
 * @category models
 */
export interface Clear {
  readonly _tag: "Clear";
}

/**
 * The field was supplied with a value: the stored value is replaced.
 *
 * @since 0.1.0
 * @category models
 */
export interface Assign<A> {
  readonly _tag: "Assign";
  readonly value: A;
}

/**
 * One clearable update field, read: exactly one of {@link CarryForward},
 * {@link Clear} and {@link Assign}.
 *
 * @since 0.1.0
 * @category models
 */
export type TriState<A> = CarryForward | Clear | Assign<A>;

/**
 * The {@link CarryForward} state.
 *
 * @since 0.1.0
 * @category constructors
 */
export const carryForward: TriState<never> = { _tag: "CarryForward" };

/**
 * The {@link Clear} state.
 *
 * @since 0.1.0
 * @category constructors
 */
export const clear: TriState<never> = { _tag: "Clear" };

/**
 * The {@link Assign} state for `value`.
 *
 * @since 0.1.0
 * @category constructors
 */
export const assign = <A>(value: A): TriState<A> => ({ _tag: "Assign", value });

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

/**
 * Read a {@link clearable} field (the `Option` encoding) into its
 * {@link TriState}, keeping all three states apart — the reader for a write
 * path.
 *
 * @example
 * ```ts
 * import { Option } from "effect"
 * import { TriState } from "@thomasfosterau/effect-schema-ext"
 *
 * console.log(TriState.read(undefined)._tag, TriState.read(Option.none())._tag, TriState.read(Option.some(1)))
 * // → CarryForward Clear { _tag: 'Assign', value: 1 }
 * ```
 *
 * @since 0.1.0
 * @category readers
 */
// oxlint-disable-next-line effect/prefer-option-over-null -- the `| undefined` is the tri-state's OUTER half (key absence), which `Schema.optionalKey` expresses and which must stay distinct from the inner `Option`'s `none`; reading both halves is precisely what this function does
export const read = <A>(field: Option.Option<A> | undefined): TriState<A> =>
  field === undefined
    ? carryForward
    : Option.match(field, { onNone: () => clear, onSome: (value) => assign(value) });

/**
 * Read a {@link clearableNullOr} field (the nullable encoding) into its
 * {@link TriState}: `undefined` carries forward, `null` clears, anything else
 * — falsy values included — is assigned. The field's type is taken whole
 * (`string | null | undefined` reads as a `TriState<string>`), so a bare
 * `null` or `undefined` reads as a `TriState<never>` that fits any field.
 *
 * @example
 * ```ts
 * import { TriState } from "@thomasfosterau/effect-schema-ext"
 *
 * console.log(TriState.readNullOr(undefined)._tag, TriState.readNullOr(null)._tag, TriState.readNullOr(0))
 * // → CarryForward Clear { _tag: 'Assign', value: 0 }
 * ```
 *
 * @since 0.1.0
 * @category readers
 */
export const readNullOr = <A>(field: A): TriState<NonNullable<A>> =>
  field === undefined ? carryForward : field === null ? clear : assign(field);

/**
 * Fold a {@link TriState} into a value, one handler per state.
 *
 * @example
 * ```ts
 * import { TriState } from "@thomasfosterau/effect-schema-ext"
 *
 * const describe = TriState.match({
 *   onCarryForward: () => "unchanged",
 *   onClear: () => "cleared",
 *   onAssign: (value: string) => `set to ${value}`
 * })
 * console.log(describe(TriState.readNullOr("Ada")), describe(TriState.readNullOr(null)))
 * // → set to Ada cleared
 * ```
 *
 * @since 0.1.0
 * @category pattern matching
 */
export const match =
  <A, B>(cases: {
    readonly onCarryForward: () => B;
    readonly onClear: () => B;
    readonly onAssign: (value: A) => B;
  }): ((state: TriState<A>) => B) =>
  (state) =>
    state._tag === "Assign"
      ? cases.onAssign(state.value)
      : state._tag === "Clear"
        ? cases.onClear()
        : cases.onCarryForward();

/**
 * Convert a {@link clearable} field (the `Option` encoding) to the nullable
 * encoding without folding: absent stays `undefined` (carry forward — leave it
 * out of a `SET` map), `Option.none()` becomes `null` (clear), `Option.some(v)`
 * becomes `v`. The bridge from an `Option`-encoded update input to a
 * `SET`-map builder that reads key presence and `null`.
 *
 * @example
 * ```ts
 * import { Option } from "effect"
 * import { TriState } from "@thomasfosterau/effect-schema-ext"
 *
 * console.log(TriState.toNullOr(undefined), TriState.toNullOr(Option.none()), TriState.toNullOr(Option.some("x")))
 * // → undefined null x
 * ```
 *
 * @since 0.1.0
 * @category converters
 */
// oxlint-disable-next-line effect/prefer-option-over-null -- converting between the two tri-state encodings: the nullable side IS the target shape
export const toNullOr = <A>(field: Option.Option<A> | undefined): A | null | undefined =>
  field === undefined ? undefined : Option.getOrNull(field);

/**
 * The value an update actually **supplies** for a {@link clearable} field,
 * collapsing the two states that supply no value at all: an absent key (carry
 * forward) and an explicit `Option.none()` (clear).
 *
 * Use it only where those two genuinely behave alike — a side effect that runs
 * only when a value is *set*, such as inserting a document's rows or
 * re-checking a slug's uniqueness. It also replaces the truthiness tests such
 * sites are tempted to make (`if (input.title)`), which an `Option` silently
 * breaks: `Option.none()` is an object, so it is always truthy.
 *
 * **Never reach for it on a write path.** There "carry forward" and "clear"
 * must produce different column values; use {@link read} or {@link toNullOr}.
 *
 * @example
 * ```ts
 * import { Option } from "effect"
 * import { TriState } from "@thomasfosterau/effect-schema-ext"
 *
 * console.log(Option.isNone(TriState.suppliedValue(undefined)), Option.isNone(TriState.suppliedValue(Option.none())))
 * // → true true
 * console.log(TriState.suppliedValue(Option.some("Ada L.")))
 * // → { _id: 'Option', _tag: 'Some', value: 'Ada L.' }
 * ```
 *
 * @since 0.1.0
 * @category readers
 */
// oxlint-disable-next-line effect/prefer-option-over-null -- the `| undefined` is the tri-state's OUTER half (key absence), which `Schema.optionalKey` expresses and which must stay distinct from the inner `Option`'s `none`; reading both halves is precisely what this function does
export const suppliedValue = <A>(field: Option.Option<A> | undefined): Option.Option<A> =>
  field ?? Option.none();

/**
 * {@link suppliedValue} for a {@link clearableNullOr} field: `undefined`
 * (carry forward) and `null` (clear) both become `Option.none()`; any other
 * value — falsy ones included — is supplied. Side effects only, never a write
 * path.
 *
 * @example
 * ```ts
 * import { TriState } from "@thomasfosterau/effect-schema-ext"
 *
 * console.log(TriState.suppliedNullOr(null)._tag, TriState.suppliedNullOr(""))
 * // → None { _id: 'Option', _tag: 'Some', value: '' }
 * ```
 *
 * @since 0.1.0
 * @category readers
 */
// oxlint-disable-next-line effect/prefer-option-over-null -- the `| null | undefined` IS the tri-state in the nullable encoding; folding its two no-value states is precisely what this function does
export const suppliedNullOr = <A>(field: A | null | undefined): Option.Option<A> =>
  Option.fromNullishOr(field);
