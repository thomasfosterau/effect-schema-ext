/**
 * @copyright Thomas Foster
 *
 * Effect Schema issue trees → RFC 6901 JSON Pointers.
 *
 * A failed decode reports a tree of `SchemaIssue`s: `Pointer` nodes carry the
 * path segments, `Composite` / `AnyOf` group siblings, `Filter` / `Encoding`
 * wrap one inner issue, and the leaves (`InvalidType`, `InvalidValue`,
 * `MissingKey`, `UnexpectedKey`, `Forbidden`, `OneOf`) say what went wrong.
 * {@link leaves} flattens the tree to its leaves with the path that reaches
 * each; {@link pointers} renders each as a JSON Pointer with its tag and
 * formatted message — the schema-only half of a field-level error response.
 * The response envelope (a JSON:API error object, a form error map) is the
 * caller's.
 *
 * @since 0.1.0
 */

import * as Array from "effect/Array";
import * as Match from "effect/Match";
import * as SchemaIssue from "effect/SchemaIssue";

/**
 * Escape one RFC 6901 reference token: `~` → `~0` first, then `/` → `~1`, so
 * the result is unambiguous.
 */
const escapeToken = (segment: PropertyKey): string =>
  String(segment).replaceAll("~", "~0").replaceAll("/", "~1");

/**
 * An RFC 6901 JSON Pointer from a path of property keys:
 * `["data", "attributes", "name"]` → `/data/attributes/name`. The empty path
 * is `""` (the whole document). Each segment is escaped (`~` → `~0`, `/` →
 * `~1`); a numeric segment is an array index.
 *
 * @example
 * ```ts
 * import { Issues } from "@thomasfosterau/effect-schema-ext"
 *
 * console.log(Issues.pathToJsonPointer(["authors", 0, "a/b"]))
 * // → /authors/0/a~1b
 * console.log(JSON.stringify(Issues.pathToJsonPointer([])))
 * // → ""
 * ```
 *
 * @since 0.1.0
 * @category constructors
 */
export const pathToJsonPointer = (path: ReadonlyArray<PropertyKey>): string =>
  Array.isReadonlyArrayEmpty(path) ? "" : `/${Array.map(path, escapeToken).join("/")}`;

/**
 * One terminal issue of a schema failure, with the path that reaches it.
 *
 * @since 0.1.0
 * @category models
 */
export interface Leaf {
  readonly path: ReadonlyArray<PropertyKey>;
  readonly issue: SchemaIssue.Issue;
}

/**
 * Flatten a schema issue tree to its leaves, accumulating every `Pointer`'s
 * path on the way down.
 *
 * `Pointer` extends the path and recurses; `Composite` and a non-empty
 * `AnyOf` recurse into each child at the same path (one leaf per rejected
 * union member); `Filter` and `Encoding` recurse into their inner issue; an
 * empty `AnyOf` (a literal-union no-match) and every other node is a leaf.
 *
 * @example
 * ```ts
 * import { Effect, Schema } from "effect"
 * import { Issues } from "@thomasfosterau/effect-schema-ext"
 *
 * const Input = Schema.Struct({ authors: Schema.Array(Schema.Struct({ name: Schema.String })) })
 * const failure = Schema.decodeUnknownEffect(Input)({ authors: [{ name: 1 }] }).pipe(Effect.flip, Effect.runSync)
 *
 * const [leaf] = Issues.leaves(failure.issue)
 * console.log(leaf?.path, leaf?.issue._tag)
 * // → [ 'authors', 0, 'name' ] InvalidType
 * ```
 *
 * @since 0.1.0
 * @category destructors
 */
export const leaves = (issue: SchemaIssue.Issue): ReadonlyArray<Leaf> => {
  const found: Array<Leaf> = [];
  const walk = (current: SchemaIssue.Issue, path: ReadonlyArray<PropertyKey>): void => {
    Match.value(current).pipe(
      // `Pointer` extends the path and recurses into its one inner issue.
      Match.tag("Pointer", (node) => walk(node.issue, [...path, ...node.path])),
      // `Composite` groups sibling issues under the same path.
      Match.tag("Composite", (node) => node.issues.forEach((child) => walk(child, path))),
      // A union no-match: one leaf per rejected member, so a caller can see
      // which branch failed — or the `AnyOf` itself when it carries none.
      Match.tag("AnyOf", (node) => {
        if (Array.isReadonlyArrayEmpty(node.issues)) found.push({ path, issue: node });
        else node.issues.forEach((child) => walk(child, path));
      }),
      // `Filter` / `Encoding` wrap one inner issue with extra context.
      Match.tag("Filter", "Encoding", (node) => walk(node.issue, path)),
      // A terminal leaf: `InvalidType`, `InvalidValue`, `MissingKey`,
      // `UnexpectedKey`, `Forbidden`, `OneOf`.
      Match.orElse((leaf) => {
        found.push({ path, issue: leaf });
      }),
    );
  };
  walk(issue, []);
  return found;
};

/**
 * Options of {@link pointers}.
 *
 * @since 0.1.0
 * @category models
 */
export interface PointerOptions {
  /**
   * Segments every pointer is placed under — `["data", "attributes"]` for a
   * flat attribute-keyed input rendered into a JSON:API document. Defaults to
   * none: the pointer addresses the decoded input itself.
   */
  readonly prefix?: ReadonlyArray<PropertyKey> | undefined;
}

/**
 * One leaf of a schema failure, rendered.
 *
 * @since 0.1.0
 * @category models
 */
export interface PointedIssue {
  /** The RFC 6901 pointer to the failing location; `""` for the whole input. */
  readonly pointer: string;
  /** The leaf's `_tag` (`InvalidType`, `MissingKey`, …): a stable code. */
  readonly tag: SchemaIssue.Issue["_tag"];
  /** The leaf's message, from Effect's default issue formatter. */
  readonly message: string;
  /** The leaf itself. */
  readonly issue: SchemaIssue.Issue;
}

/**
 * One {@link PointedIssue} per leaf of a schema failure: the pointer from the
 * accumulated path (under `prefix`), the leaf's tag and its message as
 * Effect's default formatter renders it.
 *
 * @example
 * ```ts
 * import { Effect, Schema } from "effect"
 * import { Issues } from "@thomasfosterau/effect-schema-ext"
 *
 * const Input = Schema.Struct({ name: Schema.String })
 * const failure = Schema.decodeUnknownEffect(Input)({}).pipe(Effect.flip, Effect.runSync)
 *
 * const [first] = Issues.pointers(failure.issue, { prefix: ["data", "attributes"] })
 * console.log(first?.pointer, first?.tag, first?.message)
 * // → /data/attributes/name MissingKey Missing key
 * ```
 *
 * @since 0.1.0
 * @category destructors
 */
export const pointers = (
  issue: SchemaIssue.Issue,
  options?: PointerOptions,
): ReadonlyArray<PointedIssue> => {
  const prefix = options?.prefix ?? [];
  // Effect's default formatter, per leaf: `String(issue)` is not a message
  // for a leaf node (a `MissingKey` stringifies as `[object Object]`).
  const format = SchemaIssue.makeFormatterDefault();
  return Array.map(leaves(issue), (leaf) => ({
    pointer: pathToJsonPointer([...prefix, ...leaf.path]),
    tag: leaf.issue._tag,
    message: format(leaf.issue),
    issue: leaf.issue,
  }));
};
