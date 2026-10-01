/**
 * @copyright Thomas Foster
 *
 * Identifier schemas: the UUID string, the branded-UUID id pattern, and the
 * URL-safe slug.
 *
 * **Branded ids.** Every application models an entity id as a UUID string
 * branded with the entity's name (`Uuid.pipe(Schema.brand("PersonId"))`), so
 * a `PersonId` cannot be passed where a `PlaceId` is expected. Brands live on
 * the decoded `Type` side only; the `Encoded` side stays a plain `string`, so
 * wire payloads and route params are unchanged. Brands stack: a child brand
 * piped onto a parent id ({@link refine}) is assignable wherever the parent is
 * expected, which is how an ontology (`NodeId` → `EntityId` → `PersonId`) is
 * expressed. The hierarchy itself is the application's; the pattern is here.
 *
 * **Slugs.** {@link SLUG_PATTERN} is lowercase kebab-case — alphanumerics
 * separated by single hyphens — and {@link slug} adds the length bound and the
 * reserved-segment rejection an application routing `/<collection>/<slug>`
 * needs so a slug can never shadow a static sibling route.
 *
 * `Uuid`, `SLUG_PATTERN`, `slug` and `Slug` keep the names, signatures and
 * behaviour of effect-jsonapi's `FlatQuery`, whose interim copies move here,
 * so that move is an import change, not an API change.
 *
 * @since 0.1.0
 */

import * as HashSet from "effect/HashSet";
import * as Schema from "effect/Schema";

/**
 * A string that parses as a UUID — the base every branded id refines, and the
 * shape of an optional client-generated id where a command accepts one.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Ids } from "@thomasfosterau/effect-schema-ext"
 *
 * console.log(Schema.decodeUnknownSync(Ids.Uuid)("5f0c3f9a-8a18-4f6e-9b2e-7a8a1b2c3d4e"))
 * // → 5f0c3f9a-8a18-4f6e-9b2e-7a8a1b2c3d4e
 * console.log(Schema.is(Ids.Uuid)("not-a-uuid"))
 * // → false
 * ```
 *
 * @since 0.1.0
 * @category schemas
 */
export const Uuid: Schema.String = Schema.String.check(Schema.isUUID());

/**
 * The decoded type of {@link Uuid}: a plain `string` (unbranded).
 *
 * @since 0.1.0
 * @category models
 */
export type Uuid = typeof Uuid.Type;

/**
 * A branded UUID id: {@link Uuid} piped through `Schema.brand(name)`. The
 * `Type` is `string & Brand<name>`; the `Encoded` side stays `string`.
 *
 * Brand a trusted value (a database row's id) with the schema's `make`
 * (`PersonId.make(row.id)`) — nominal, not a re-validation; decode an
 * untrusted one through the schema.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Ids } from "@thomasfosterau/effect-schema-ext"
 *
 * const PersonId = Ids.make("PersonId")
 * type PersonId = typeof PersonId.Type
 *
 * const id: PersonId = Schema.decodeUnknownSync(PersonId)("5f0c3f9a-8a18-4f6e-9b2e-7a8a1b2c3d4e")
 * console.log(id)
 * // → 5f0c3f9a-8a18-4f6e-9b2e-7a8a1b2c3d4e
 * console.log(Schema.is(PersonId)("5f0c3f9a"))
 * // → false
 * ```
 *
 * @since 0.1.0
 * @category constructors
 */
export const make = <const B extends string>(brand: B): Schema.brand<Schema.String, B> =>
  Uuid.pipe(Schema.brand(brand));

/**
 * A child id: `parent` with one more brand stacked on. The result is
 * assignable wherever `parent`'s type is expected (a `PersonId` is an
 * `AgentId`), but not the other way round — the polymorphic seams of an
 * ontology ask for the brand at the level they accept.
 *
 * @example
 * ```ts
 * import { Ids } from "@thomasfosterau/effect-schema-ext"
 *
 * const EntityId = Ids.make("EntityId")
 * const PersonId = Ids.refine(EntityId, "PersonId")
 *
 * const person = PersonId.make("5f0c3f9a-8a18-4f6e-9b2e-7a8a1b2c3d4e")
 * const entity: typeof EntityId.Type = person // a PersonId is an EntityId
 * console.log(entity)
 * // → 5f0c3f9a-8a18-4f6e-9b2e-7a8a1b2c3d4e
 * ```
 *
 * @since 0.1.0
 * @category constructors
 */
export const refine = <S extends Schema.ConstraintRebuildable, const B extends string>(
  parent: S,
  brand: B,
): Schema.brand<S["Rebuild"], B> => Schema.brand(brand)(parent);

/**
 * Lowercase kebab-case: letters and digits in segments joined by single
 * hyphens — no leading, trailing or doubled hyphen, no uppercase, no
 * whitespace. Exported so a route param matcher can match the same shape
 * without a second, driftable copy of the regex.
 *
 * @since 0.1.0
 * @category constants
 */
export const SLUG_PATTERN: RegExp = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The message a {@link SLUG_PATTERN} mismatch reports.
 */
const SLUG_PATTERN_MESSAGE = `must be lowercase letters, numbers, and hyphens (e.g. "my-post-title")`;

/**
 * The longest slug {@link slug} accepts when no `maxLength` is given.
 *
 * @since 0.1.0
 * @category constants
 */
export const DEFAULT_MAX_SLUG_LENGTH = 200;

/**
 * Options of {@link slug}.
 *
 * @since 0.1.0
 * @category models
 */
export interface SlugOptions {
  /** The longest slug accepted. Defaults to {@link DEFAULT_MAX_SLUG_LENGTH} (`200`). */
  readonly maxLength?: number | undefined;
  /**
   * Path segments a slug may never equal — the static sibling routes of the
   * collection it names (`create`, `edit`, `search`, …), which a slug would
   * otherwise shadow and make unreachable. None when omitted.
   */
  readonly reserved?: Iterable<string> | undefined;
}

/**
 * A human-readable slug: 1 to `maxLength` characters of {@link SLUG_PATTERN},
 * not a reserved path segment. Uniqueness is a storage concern, not a schema
 * one. Behaves exactly as effect-jsonapi's `FlatQuery.slug`, including its
 * messages.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Ids } from "@thomasfosterau/effect-schema-ext"
 *
 * const PostSlug = Ids.slug({ reserved: ["create", "edit", "search", "new", "delete"] })
 *
 * console.log(Schema.is(PostSlug)("my-post-title"))
 * // → true
 * console.log(Schema.is(PostSlug)("edit"))
 * // → false
 * console.log(Schema.is(PostSlug)("a".repeat(201)))
 * // → false
 * ```
 *
 * @since 0.1.0
 * @category constructors
 */
export const slug = (options?: SlugOptions): Schema.String => {
  const reserved = HashSet.fromIterable(options?.reserved ?? []);
  return Schema.String.check(
    Schema.isBetweenLength(1, options?.maxLength ?? DEFAULT_MAX_SLUG_LENGTH),
    Schema.isPattern(SLUG_PATTERN, { message: SLUG_PATTERN_MESSAGE }),
    Schema.makeFilter(
      (value: string) =>
        HashSet.has(reserved, value)
          ? `"${value}" is a reserved path segment and cannot be used as a slug`
          : true,
      {
        identifier: "notReservedSlug",
        title: "not a reserved slug",
        description: "rejects path segments that collide with a static sibling route",
      },
    ),
  );
};

/**
 * {@link slug} with its defaults: 1 to 200 characters, no reserved segments.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Ids } from "@thomasfosterau/effect-schema-ext"
 *
 * console.log(Schema.is(Ids.Slug)("anthony-albanese"), Schema.is(Ids.Slug)("Anthony--Albanese"))
 * // → true false
 * ```
 *
 * @since 0.1.0
 * @category schemas
 */
export const Slug: Schema.String = slug();

/**
 * The decoded type of {@link Slug}: a plain `string` (unbranded).
 *
 * @since 0.1.0
 * @category models
 */
export type Slug = typeof Slug.Type;
