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
import * as JsonPointer from "effect/JsonPointer";
import * as Match from "effect/Match";
import * as SchemaIssue from "effect/SchemaIssue";

/** One path segment as an escaped RFC 6901 reference token (Effect's own escaping). */
const escapeToken = (segment: PropertyKey): string => JsonPointer.escapeToken(String(segment));

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
export const leaves = (issue: SchemaIssue.Issue): ReadonlyArray<Leaf> =>
  Array.map(walkLeaves(issue), ({ path, issue: leaf }) => ({ path, issue: leaf }));

/**
 * A leaf plus the node its message is best formatted from: the leaf itself,
 * or — for a built-in check (`isMinLength`, `isPattern`, …) whose failure is
 * an `InvalidValue` carrying no message of its own — the `Filter` wrapping it,
 * which knows what was expected ("Expected a value with a length of at least
 * 3" rather than "Expected a valid value").
 */
interface WalkedLeaf extends Leaf {
  readonly formatFrom: SchemaIssue.Issue;
}

/** An `InvalidValue` that states no message of its own. */
const isBareInvalidValue = (issue: SchemaIssue.Issue): boolean =>
  issue._tag === "InvalidValue" && issue.annotations?.message === undefined;

const walkLeaves = (issue: SchemaIssue.Issue): ReadonlyArray<WalkedLeaf> => {
  const found: Array<WalkedLeaf> = [];
  const push = (path: ReadonlyArray<PropertyKey>, leaf: SchemaIssue.Issue) =>
    found.push({ path, issue: leaf, formatFrom: leaf });
  const walk = (current: SchemaIssue.Issue, path: ReadonlyArray<PropertyKey>): void => {
    Match.value(current).pipe(
      // `Pointer` extends the path and recurses into its one inner issue.
      Match.tag("Pointer", (node) => walk(node.issue, [...path, ...node.path])),
      // `Composite` groups sibling issues under the same path.
      Match.tag("Composite", (node) => node.issues.forEach((child) => walk(child, path))),
      // A union no-match: one leaf per rejected member, so a caller can see
      // which branch failed — or the `AnyOf` itself when it carries none.
      Match.tag("AnyOf", (node) => {
        if (Array.isReadonlyArrayEmpty(node.issues)) push(path, node);
        else node.issues.forEach((child) => walk(child, path));
      }),
      // A `Filter` wrapping a message-less `InvalidValue` is a built-in check
      // failing: keep the leaf, but format from the filter, which carries the
      // expectation. Any other `Filter`, and every `Encoding`, just unwraps.
      Match.tag("Filter", (node) => {
        if (isBareInvalidValue(node.issue)) {
          found.push({ path, issue: node.issue, formatFrom: node });
        } else walk(node.issue, path);
      }),
      Match.tag("Encoding", (node) => walk(node.issue, path)),
      // A terminal leaf: `InvalidType`, `InvalidValue`, `MissingKey`,
      // `UnexpectedKey`, `Forbidden`, `OneOf`.
      Match.orElse((leaf) => {
        push(path, leaf);
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
  /**
   * The leaf's message, from Effect's default issue formatter — formatted from
   * the enclosing `Filter` when the leaf is a built-in check's message-less
   * `InvalidValue`, so the expectation survives.
   */
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
 *
 * const Short = Schema.Struct({ code: Schema.String.check(Schema.isMinLength(3)) })
 * const tooShort = Schema.decodeUnknownEffect(Short)({ code: "ab" }).pipe(Effect.flip, Effect.runSync)
 * console.log(Issues.pointers(tooShort.issue)[0]?.message)
 * // → Expected a value with a length of at least 3
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
  return Array.map(walkLeaves(issue), (leaf) => ({
    pointer: pathToJsonPointer([...prefix, ...leaf.path]),
    tag: leaf.issue._tag,
    message: format(leaf.formatFrom),
    issue: leaf.issue,
  }));
};
