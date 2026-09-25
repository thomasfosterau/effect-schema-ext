/**
 * @copyright Thomas Foster
 *
 * The introspection probes (`src/Ast.ts`), ported from the applications'
 * `packages/models/tests/resource-projections.test.ts` — the
 * optional / nullable / array / date recovery, without the `Resource.make`
 * descriptor or the `dbColumn` annotation (those stay with effect-drizzle-ext's
 * `resourceAttributeProjections`, which these probes serve).
 *
 * @module tests/Ast
 */

import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";
import { Ast } from "@thomasfosterau/effect-schema-ext";

const IsoDate = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/));

const Person = Schema.Struct({
  name: Schema.String,
  givenName: Schema.NullOr(Schema.String),
  birthDate: Schema.NullOr(IsoDate),
  tags: Schema.Array(Schema.String),
  byVoteType: Schema.Record(Schema.String, Schema.Finite),
  createdAt: Schema.Date,
  deletedAt: Schema.optionalKey(Schema.Date),
  note: Schema.optional(Schema.String),
  summary: Schema.optionalKey(Schema.OptionFromNullOr(Schema.String)),
});

const byKey = Object.fromEntries(
  Ast.fieldTraits(Person.fields).map((traits) => [traits.key, traits]),
);

describe("fieldTraits", () => {
  it("recovers a plain field", () => {
    expect(byKey.name).toEqual({
      key: "name",
      optional: false,
      nullable: false,
      array: false,
      date: false,
    });
  });

  it("flags nullable fields", () => {
    expect(byKey.givenName).toMatchObject({ nullable: true, optional: false });
    expect(byKey.summary).toMatchObject({ nullable: true, optional: true });
  });

  it("flags the timestamp axes as dates, and calendar dates as plain strings", () => {
    expect(byKey.createdAt).toMatchObject({ date: true, nullable: false });
    expect(byKey.birthDate).toMatchObject({ date: false, nullable: true });
  });

  it("flags the optional tombstone", () => {
    expect(byKey.deletedAt).toMatchObject({ optional: true, date: true });
    expect(byKey.note).toMatchObject({ optional: true, date: false });
  });

  it("flags list fields as arrays and does not mistake a record for one", () => {
    expect(byKey.tags).toMatchObject({ array: true, nullable: false });
    expect(byKey.byVoteType).toMatchObject({ array: false, nullable: false });
  });

  it("preserves declaration order", () => {
    expect(Ast.fieldTraits(Person.fields).map((traits) => traits.key)).toEqual(
      Object.keys(Person.fields),
    );
  });
});

describe("the individual probes", () => {
  it("reads a date through its JSON codec, not the bare Date decoder", () => {
    // `Schema.Date`'s own decoder accepts only a `Date` instance; the probe
    // asks the wire question, which is what a row mapper needs.
    expect(Ast.isDate(Schema.Date)).toBe(true);
    expect(Ast.isDate(Schema.NullOr(Schema.Date))).toBe(true);
    expect(Ast.isDate(Schema.String)).toBe(false);
    expect(Ast.isDate(Schema.Finite)).toBe(false);
  });

  it("sees through wrappers the AST would have to unpick", () => {
    const Branded = Schema.Array(Schema.String).pipe(Schema.brand("Tags"));
    expect(Ast.isArray(Branded)).toBe(true);
    expect(Ast.acceptsNull(Schema.NullOr(Schema.Trim))).toBe(true);
  });

  it("reads optionality off the key, not the value", () => {
    expect(Ast.isOptionalKey(Schema.optionalKey(Schema.NullOr(Schema.String)))).toBe(true);
    expect(Ast.isOptionalKey(Schema.NullOr(Schema.String))).toBe(false);
  });
});
