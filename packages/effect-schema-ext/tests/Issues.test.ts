/**
 * @copyright Thomas Foster
 *
 * The schema-issue pointer walk (`src/Issues.ts`), ported from the
 * applications' `packages/api/tests/jsonapi-error.test.ts` — the
 * `pathToJsonPointer` cases and the `effectSchemaIssueToErrors` pointer / code
 * cases, with the JSON:API envelope (status, `source`) left to the caller and
 * the `data/attributes` prefix passed explicitly.
 *
 * @module tests/Issues
 */

import { describe, expect, it } from "vite-plus/test";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as SchemaAST from "effect/SchemaAST";
import * as SchemaIssue from "effect/SchemaIssue";
import * as SchemaParser from "effect/SchemaParser";
import { Issues } from "@thomasfosterau/effect-schema-ext";

const ATTRIBUTES = ["data", "attributes"] as const;

/** The issue tree a failed decode raises. */
const issueFor = <S extends Schema.Codec<unknown, unknown, never, never>>(
  schema: S,
  input: unknown,
): SchemaIssue.Issue =>
  SchemaParser.decodeUnknownResult(schema)(input).pipe(
    Result.getFailure,
    Option.getOrElse(() => expect.unreachable("the decode was expected to fail")),
  );

const unionAst: SchemaAST.Union = Schema.Union([Schema.String, Schema.Finite]).ast;

const pointed = (issue: SchemaIssue.Issue) => Issues.pointers(issue, { prefix: ATTRIBUTES });

describe("pathToJsonPointer", () => {
  it("returns empty string for an empty path", () => {
    expect(Issues.pathToJsonPointer([])).toBe("");
  });

  it("joins segments with /", () => {
    expect(Issues.pathToJsonPointer(["data", "attributes", "name"])).toBe("/data/attributes/name");
  });

  it("encodes / as ~1 and ~ as ~0 per RFC 6901", () => {
    expect(Issues.pathToJsonPointer(["a/b"])).toBe("/a~1b");
    expect(Issues.pathToJsonPointer(["a~b"])).toBe("/a~0b");
    // ~ must be encoded before / so the result is unambiguous.
    expect(Issues.pathToJsonPointer(["a~/b"])).toBe("/a~0~1b");
  });

  it("handles numeric path segments", () => {
    expect(Issues.pathToJsonPointer(["authors", 0, "agentId"])).toBe("/authors/0/agentId");
  });

  it("encodes an empty-string segment as an empty token", () => {
    expect(Issues.pathToJsonPointer([""])).toBe("/");
  });
});

describe("pointers", () => {
  it("places a wrong root type at the prefix itself", () => {
    const [only, ...rest] = pointed(issueFor(Schema.String, 42));
    expect(rest).toHaveLength(0);
    expect(only).toMatchObject({ pointer: "/data/attributes", tag: "InvalidType" });
  });

  it("addresses the whole input with an empty pointer when there is no prefix", () => {
    expect(Issues.pointers(issueFor(Schema.String, 42))).toMatchObject([
      { pointer: "", tag: "InvalidType" },
    ]);
  });

  it("maps a nested attribute path into /data/attributes/<field>", () => {
    const schema = Schema.Struct({
      name: Schema.String,
      description: Schema.optional(Schema.String),
    });
    expect(pointed(issueFor(schema, { name: 42 }))).toMatchObject([
      { pointer: "/data/attributes/name", tag: "InvalidType" },
    ]);
  });

  it("flattens a hand-rolled Composite into one entry per child", () => {
    // Build the Composite directly so the test does not rely on the schema
    // runtime's fail-fast behaviour.
    const composite = new SchemaIssue.Composite(Schema.Struct({}).ast, [
      new SchemaIssue.Pointer(["name"], new SchemaIssue.MissingKey(undefined)),
      new SchemaIssue.Pointer(["age"], new SchemaIssue.InvalidValue()),
    ]);
    const entries = pointed(composite);
    expect(entries.map((e) => e.pointer).toSorted()).toEqual([
      "/data/attributes/age",
      "/data/attributes/name",
    ]);
    expect(entries.map((e) => e.tag).toSorted()).toEqual(["InvalidValue", "MissingKey"]);
  });

  it("handles array index paths", () => {
    const schema = Schema.Struct({
      authors: Schema.Array(Schema.Struct({ agentId: Schema.String })),
    });
    expect(pointed(issueFor(schema, { authors: [{ agentId: 1 }] }))).toMatchObject([
      { pointer: "/data/attributes/authors/0/agentId" },
    ]);
  });

  it("emits MissingKey for required fields", () => {
    expect(pointed(issueFor(Schema.Struct({ name: Schema.String }), {}))).toMatchObject([
      { tag: "MissingKey", pointer: "/data/attributes/name" },
    ]);
  });

  it("honours a custom prefix (empty for full-document inputs)", () => {
    const issue = issueFor(Schema.Struct({ name: Schema.String }), { name: 42 });
    expect(Issues.pointers(issue, { prefix: [] })[0]?.pointer).toBe("/name");
  });

  it("keeps a built-in check's expectation in the message (isMinLength)", () => {
    const schema = Schema.Struct({ code: Schema.String.check(Schema.isMinLength(3)) });
    expect(pointed(issueFor(schema, { code: "ab" }))).toMatchObject([
      {
        pointer: "/data/attributes/code",
        tag: "InvalidValue",
        message: "Expected a value with a length of at least 3",
      },
    ]);
  });

  it("keeps a check's own message when it states one", () => {
    const withMessage = Schema.String.check(Schema.isMinLength(3, { message: "too short" }));
    expect(Issues.pointers(issueFor(withMessage, "ab"))).toMatchObject([
      { tag: "InvalidValue", message: "too short" },
    ]);
    const custom = Schema.String.check(
      Schema.makeFilter((value: string) => (value === "x" ? true : "must be x"), {
        identifier: "isX",
        title: "is x",
        description: "a fixture filter that states its own message",
      }),
    );
    expect(Issues.pointers(issueFor(custom, "ab"))).toMatchObject([
      { tag: "InvalidValue", message: "must be x" },
    ]);
  });

  it("reports the leaf, not the filter, from leaves()", () => {
    const schema = Schema.String.check(Schema.isMinLength(3));
    expect(Issues.leaves(issueFor(schema, "ab"))).toMatchObject([
      { path: [], issue: { _tag: "InvalidValue" } },
    ]);
  });

  it("escapes key segments in the emitted pointer", () => {
    const issue = issueFor(Schema.Struct({ "a/b": Schema.String }), { "a/b": 1 });
    expect(pointed(issue)[0]?.pointer).toBe("/data/attributes/a~1b");
  });

  it("carries the leaf's formatted message, not an object's default string", () => {
    const [invalid] = pointed(issueFor(Schema.String, 42));
    expect(invalid?.message).toBe("Expected string");
    const [missing] = pointed(issueFor(Schema.Struct({ name: Schema.String }), {}));
    expect(missing?.message).toBe("Missing key");
    expect(missing?.message).not.toContain("[object Object]");
  });
});

// AnyOf / Filter / Encoding are wrapper issues the schema runtime emits for
// union / refinement / transformation failures. Building them directly drives
// the walker's wrapper-recursion branches without depending on which real
// schema shape produces each tag.
describe("leaves — wrapper issue recursion", () => {
  it("recurses through a Filter into its inner leaf, preserving the path", () => {
    const pointer = new SchemaIssue.Pointer(["name"], new SchemaIssue.InvalidValue());
    const filter = new SchemaIssue.Filter(Schema.isMinLength(1), pointer);
    expect(pointed(filter)).toMatchObject([
      { tag: "InvalidValue", pointer: "/data/attributes/name" },
    ]);
  });

  it("recurses through an Encoding wrapper into its inner leaf", () => {
    const leaf = new SchemaIssue.InvalidType(Schema.String.ast);
    const encoding = new SchemaIssue.Encoding(Schema.String.ast, leaf);
    expect(pointed(encoding)).toMatchObject([{ tag: "InvalidType", pointer: "/data/attributes" }]);
  });

  it("emits one entry per branch for a non-empty AnyOf (union no-match)", () => {
    const anyOf = new SchemaIssue.AnyOf(unionAst, [
      new SchemaIssue.Pointer(["name"], new SchemaIssue.InvalidValue()),
      new SchemaIssue.Pointer(["age"], new SchemaIssue.MissingKey(undefined)),
    ]);
    expect(
      pointed(anyOf)
        .map((e) => e.pointer)
        .toSorted(),
    ).toEqual(["/data/attributes/age", "/data/attributes/name"]);
  });

  it("emits a single AnyOf leaf when the union has no member issues", () => {
    const anyOf = new SchemaIssue.AnyOf(unionAst, []);
    const found = Issues.leaves(anyOf);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ path: [], issue: { _tag: "AnyOf" } });
  });

  it("walks a real union failure to one leaf per member", () => {
    const schema = Schema.Struct({ value: Schema.Union([Schema.String, Schema.Finite]) });
    const found = Issues.leaves(issueFor(schema, { value: true }));
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found.map((leaf) => leaf.path)).toEqual(found.map(() => ["value"]));
  });
});
