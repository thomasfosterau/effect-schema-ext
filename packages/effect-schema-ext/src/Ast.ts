/**
 * Schema introspection by AST and by **behavioural decode probe**.
 *
 * Code that derives something from a model — a row mapper, a column map, a
 * form — needs to know a field's *shape*: may the key be absent, does it
 * accept `null`, is it a list, is it a timestamp. Reading those off the AST
 * breaks on every wrapping (a `NullOr` of a transformation, a branded array, a
 * refined date); asking the schema itself — "do you decode `null`?" — does
 * not. Optionality is the exception: it is a property of the struct key, not
 * of any value, so it is read off the AST.
 *
 * Every probe decodes through the schema's **JSON codec**
 * (`Schema.toCodecJson`), i.e. the wire reading: `Schema.Date`'s own decoder
 * accepts only a `Date` instance, while its JSON codec accepts the ISO string
 * a wire payload or a database driver hands over. A decoder is built per
 * call: this is start-up introspection over a model, not a hot path — cache
 * the result, not the probe.
 *
 * A schema that accepts any input (`Schema.Unknown`) reports `acceptsNull` and
 * `isArray`, since it decodes `null` and `[]`. A schema whose decoding needs
 * services is not supported.
 *
 * @copyright Thomas Foster
 * @since 0.1.0
 */

import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";
import * as SchemaAST from "effect/SchemaAST";

/** An ISO timestamp a `Date`-decoding schema's JSON codec accepts. */
const ISO_PROBE = "2024-01-02T03:04:05.000Z";

/**
 * What `schema`'s JSON codec decodes `input` to, if it decodes it at all.
 */
const probe = (schema: Schema.Constraint, input: unknown): Option.Option<unknown> =>
  // SAFETY: a probe asks only whether a decode succeeds. A schema whose
  // decoding needs services cannot be decoded without them, and
  // `Schema.Constraint` cannot express "no services"; the probe treats such a
  // schema as the caller's error, exactly as the applications' reflection
  // did.
  Schema.decodeUnknownOption(Schema.toCodecJson(schema as Schema.Codec<unknown>))(input);

/**
 * Whether the field is optional as a struct key (`Schema.optionalKey` /
 * `Schema.optional`): absent is a valid value for it.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Ast } from "@thomasfosterau/effect-schema-ext"
 *
 * console.log(Ast.isOptionalKey(Schema.optionalKey(Schema.String)), Ast.isOptionalKey(Schema.String))
 * // → true false
 * ```
 *
 * @since 0.1.0
 * @category predicates
 */
export const isOptionalKey = (schema: Schema.Constraint): boolean =>
  SchemaAST.isOptional(schema.ast);

/**
 * Whether the schema accepts `null` on the wire (a `Schema.NullOr`, or an
 * `OptionFromNullOr` whose `null` decodes to `Option.none()`).
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Ast } from "@thomasfosterau/effect-schema-ext"
 *
 * console.log(Ast.acceptsNull(Schema.NullOr(Schema.String)), Ast.acceptsNull(Schema.String))
 * // → true false
 * ```
 *
 * @since 0.1.0
 * @category predicates
 */
export const acceptsNull = (schema: Schema.Constraint): boolean =>
  Option.isSome(probe(schema, null));

/**
 * Whether the schema accepts an empty list on the wire — a list-valued field.
 * A schema that rejects the empty list (a non-empty array) reports `false`.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Ast } from "@thomasfosterau/effect-schema-ext"
 *
 * console.log(Ast.isArray(Schema.Array(Schema.String)), Ast.isArray(Schema.String))
 * // → true false
 * ```
 *
 * @since 0.1.0
 * @category predicates
 */
export const isArray = (schema: Schema.Constraint): boolean => Option.isSome(probe(schema, []));

/**
 * Whether the schema decodes an ISO timestamp string to a `Date` — a
 * timestamp axis (`createdAt`, `publishedAt`), as opposed to a date-shaped
 * string kept as a string.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Ast } from "@thomasfosterau/effect-schema-ext"
 *
 * console.log(Ast.isDate(Schema.Date), Ast.isDate(Schema.NullOr(Schema.Date)), Ast.isDate(Schema.String))
 * // → true true false
 * ```
 *
 * @since 0.1.0
 * @category predicates
 */
export const isDate = (schema: Schema.Constraint): boolean =>
  Option.exists(probe(schema, ISO_PROBE), Predicate.isDate);

/**
 * The traits of one struct field, as plain data.
 *
 * @since 0.1.0
 * @category models
 */
export interface FieldTraits {
  /** The field's key. */
  readonly key: string;
  /** The key may be absent ({@link isOptionalKey}). */
  readonly optional: boolean;
  /** The value may be `null` ({@link acceptsNull}). */
  readonly nullable: boolean;
  /** The value is a list ({@link isArray}). */
  readonly array: boolean;
  /** The value decodes from an ISO timestamp to a `Date` ({@link isDate}). */
  readonly date: boolean;
}

/**
 * The {@link FieldTraits} of every field of a struct, in declaration order —
 * what a derivation over a model (a row → resource mapper, a column map)
 * reads instead of restating each field's traits by hand.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Ast } from "@thomasfosterau/effect-schema-ext"
 *
 * const Note = Schema.Struct({
 *   title: Schema.String,
 *   summary: Schema.optionalKey(Schema.NullOr(Schema.String)),
 *   tags: Schema.Array(Schema.String),
 *   publishedAt: Schema.Date
 * })
 * for (const { key, optional, nullable, array, date } of Ast.fieldTraits(Note.fields)) {
 *   console.log(key, { optional, nullable, array, date })
 * }
 * // → title { optional: false, nullable: false, array: false, date: false }
 * // → summary { optional: true, nullable: true, array: false, date: false }
 * // → tags { optional: false, nullable: false, array: true, date: false }
 * // → publishedAt { optional: false, nullable: false, array: false, date: true }
 * ```
 *
 * @since 0.1.0
 * @category destructors
 */
export const fieldTraits = (fields: Schema.Struct.Fields): ReadonlyArray<FieldTraits> =>
  Record.toEntries(fields).map(([key, schema]) => ({
    key,
    optional: isOptionalKey(schema),
    nullable: acceptsNull(schema),
    array: isArray(schema),
    date: isDate(schema),
  }));
