/**
 * @copyright Thomas Foster
 *
 * The update tri-state (`src/TriState.ts`), ported from the applications:
 *
 * - `suppliedValue` — website / gardeneria `packages/models/tests/tri-state.test.ts`
 *   (the `Option` encoding) and preferenceflow's (the nullable encoding, here
 *   `suppliedNullOr`);
 * - the wire invariants of both field encodings — website / gardeneria
 *   `packages/models/tests/update-tri-state-wire.test.ts` (`clearable`) and
 *   preferenceflow `packages/models/tests/tri-state.test.ts` (`clearableNullOr`),
 *   asserted per field on a fixture struct instead of per exported `Update*`
 *   schema.
 *
 * **Nothing here migrates to `Option`.** The nullable values in this file are
 * the tri-state the module implements: an absent key carries the stored value
 * forward, `null` clears it, a value overwrites.
 *
 * @module tests/TriState
 */

/* oxlint-disable effect/prefer-option-over-null -- the `null` / `undefined` arms ARE the tri-state under test */
import { describe, expect, it } from "vite-plus/test";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { TriState } from "@thomasfosterau/effect-schema-ext";

describe("suppliedValue (the Option encoding)", () => {
  it("reads an absent key as no value supplied", () => {
    // Key absence is the tri-state's outer half: the caller supplied nothing,
    // so a stored value carries forward.
    expect(TriState.suppliedValue(undefined)).toStrictEqual(Option.none());
  });

  it("reads an explicit clear as no value supplied", () => {
    expect(TriState.suppliedValue(Option.none())).toStrictEqual(Option.none());
  });

  it("folds absence and an explicit clear together", () => {
    // The fold is the point, and the hazard: both arms mean "no value to act
    // on" for a side effect, and mean DIFFERENT things for a column write.
    expect(TriState.suppliedValue(undefined)).toStrictEqual(TriState.suppliedValue(Option.none()));
  });

  it("passes a supplied value through", () => {
    expect(TriState.suppliedValue(Option.some("Ada L."))).toStrictEqual(Option.some("Ada L."));
  });

  it("preserves a falsy supplied value", () => {
    // The truthiness tests this helper replaced would have dropped these; an
    // empty string and a zero are supplied values like any other.
    expect(TriState.suppliedValue(Option.some(""))).toStrictEqual(Option.some(""));
    expect(TriState.suppliedValue(Option.some(0))).toStrictEqual(Option.some(0));
  });
});

describe("suppliedNullOr (the nullable encoding)", () => {
  it("reads an absent key and an explicit null alike, as no value supplied", () => {
    expect(TriState.suppliedNullOr(undefined)).toStrictEqual(Option.none());
    expect(TriState.suppliedNullOr(null)).toStrictEqual(Option.none());
    expect(TriState.suppliedNullOr(undefined)).toStrictEqual(TriState.suppliedNullOr(null));
  });

  it("passes a supplied value through, falsy ones included", () => {
    expect(TriState.suppliedNullOr("Ada L.")).toStrictEqual(Option.some("Ada L."));
    expect(TriState.suppliedNullOr("")).toStrictEqual(Option.some(""));
    expect(TriState.suppliedNullOr(0)).toStrictEqual(Option.some(0));
    expect(TriState.suppliedNullOr(false)).toStrictEqual(Option.some(false));
  });
});

describe("read / readNullOr keep the three states apart", () => {
  it("reads the Option encoding", () => {
    expect(TriState.read(undefined)).toStrictEqual(TriState.carryForward);
    expect(TriState.read(Option.none())).toStrictEqual(TriState.clear);
    expect(TriState.read(Option.some("v"))).toStrictEqual(TriState.assign("v"));
  });

  it("reads the nullable encoding, falsy values as assignments", () => {
    expect(TriState.readNullOr(undefined)).toStrictEqual(TriState.carryForward);
    expect(TriState.readNullOr(null)).toStrictEqual(TriState.clear);
    expect(TriState.readNullOr(0)).toStrictEqual(TriState.assign(0));
    expect(TriState.readNullOr("")).toStrictEqual(TriState.assign(""));
    expect(TriState.readNullOr(false)).toStrictEqual(TriState.assign(false));
  });

  it("never reads a carry-forward as a clear", () => {
    expect(TriState.read(undefined)).not.toStrictEqual(TriState.read(Option.none()));
    expect(TriState.readNullOr(undefined)).not.toStrictEqual(TriState.readNullOr(null));
  });

  it("folds with one handler per state", () => {
    const describeState = TriState.match({
      onCarryForward: () => "carry",
      onClear: () => "clear",
      onAssign: (value: number) => `assign ${value}`,
    });
    expect(describeState(TriState.readNullOr(undefined))).toBe("carry");
    expect(describeState(TriState.readNullOr(null))).toBe("clear");
    expect(describeState(TriState.readNullOr(0))).toBe("assign 0");
  });
});

describe("toNullOr converts the Option encoding to the nullable one without folding", () => {
  it("keeps absence, clear and value distinct", () => {
    expect(TriState.toNullOr(undefined)).toBeUndefined();
    expect(TriState.toNullOr(Option.none())).toBeNull();
    expect(TriState.toNullOr(Option.some("x"))).toBe("x");
    expect(TriState.toNullOr(Option.some(0))).toBe(0);
  });

  describe("agrees with readNullOr on every state", () => {
    it.each([undefined, Option.none(), Option.some("x")])("%s", (field) => {
      expect(TriState.readNullOr(TriState.toNullOr(field))).toStrictEqual(TriState.read(field));
    });
  });
});

describe("toNullOrFields converts a whole Option-encoded update input", () => {
  const Update = Schema.Struct({
    id: Schema.String,
    title: TriState.clearable(Schema.String),
    summary: TriState.clearable(Schema.String),
    count: TriState.clearable(Schema.Finite),
    name: Schema.optional(Schema.String),
  });
  const decode = Schema.decodeUnknownSync(Update);

  it("maps none to null, some to its value, and passes other fields through", () => {
    const input = decode({ id: "a", title: "T", summary: null, count: 0, name: "N" });
    expect(TriState.toNullOrFields(input)).toStrictEqual({
      id: "a",
      title: "T",
      summary: null,
      count: 0,
      name: "N",
    });
  });

  it("leaves an absent key absent — never a present undefined or a null", () => {
    const converted = TriState.toNullOrFields(decode({ id: "a", summary: null }));
    expect(converted).toStrictEqual({ id: "a", summary: null });
    expect("title" in converted).toBe(false);
    expect("count" in converted).toBe(false);
  });

  it("keeps an explicit undefined as undefined (carry forward)", () => {
    expect(TriState.toNullOrFields({ id: "a", summary: undefined })).toStrictEqual({
      id: "a",
      summary: undefined,
    });
  });

  it("agrees with toNullOr field by field", () => {
    const input = decode({ id: "a", title: "T", summary: null });
    const converted = TriState.toNullOrFields(input);
    expect(converted.title).toBe(TriState.toNullOr(input.title));
    expect(converted.summary).toBe(TriState.toNullOr(input.summary));
  });

  it("keeps the input's own key order", () => {
    const converted = TriState.toNullOrFields(decode({ summary: null, id: "a", title: "T" }));
    // `Reflect.ownKeys`: `Record.keys` wants every key present, and these
    // fields are optional.
    expect(Reflect.ownKeys(converted)).toEqual(
      Reflect.ownKeys(decode({ summary: null, id: "a", title: "T" })),
    );
  });
});

describe("clearable — the Option encoding on the wire", () => {
  const Update = Schema.Struct({
    id: Schema.String,
    summary: TriState.clearable(Schema.String),
    count: TriState.clearable(Schema.Finite),
  });
  const decode = Schema.decodeUnknownSync(Update);
  const encode = Schema.encodeSync(Update);

  it("keeps an absent key absent — never a present undefined or a none", () => {
    const patched = decode({ id: "a" });
    expect("summary" in patched).toBe(false);
    expect("count" in patched).toBe(false);
    expect(encode(patched)).toEqual({ id: "a" });
  });

  it("decodes null to Option.none() and re-encodes it as null", () => {
    const patched = decode({ id: "a", summary: null });
    expect(patched.summary).toStrictEqual(Option.none());
    expect("count" in patched).toBe(false);
    expect(encode(patched)).toEqual({ id: "a", summary: null });
  });

  it("decodes a value to Option.some and re-encodes it unchanged", () => {
    const patched = decode({ id: "a", summary: "text", count: 0 });
    expect(patched.summary).toStrictEqual(Option.some("text"));
    expect(patched.count).toStrictEqual(Option.some(0));
    expect(encode(patched)).toEqual({ id: "a", summary: "text", count: 0 });
  });

  it("decodes absence and null to different things (the OptionFromOptionalNullOr trap)", () => {
    // `Schema.OptionFromOptionalNullOr` would decode both to `Option.none()`
    // on a required key, so every PATCH would clear the fields it omits.
    const absent = decode({ id: "a" });
    const cleared = decode({ id: "a", summary: null });
    expect(TriState.read(absent.summary)).toStrictEqual(TriState.carryForward);
    expect(TriState.read(cleared.summary)).toStrictEqual(TriState.clear);
  });

  it("rejects a value of the wrong type", () => {
    expect(() => decode({ id: "a", summary: 1 })).toThrow(Schema.SchemaError);
  });
});

describe("clearableNullOr — the nullable encoding on the wire", () => {
  const Update = Schema.Struct({
    id: Schema.String,
    birthPlaceId: TriState.clearableNullOr(Schema.String),
    name: Schema.optional(Schema.String),
  });
  const decode = Schema.decodeUnknownSync(Update);
  const encode = Schema.encodeSync(Update);

  it("keeps an absent key absent — never a present undefined", () => {
    const patched = decode({ id: "a" });
    expect("birthPlaceId" in patched).toBe(false);
    expect("name" in patched).toBe(false);
    expect(encode(patched)).toEqual({ id: "a" });
  });

  it("decodes null on a clearable field to null and re-encodes it as null", () => {
    const patched = decode({ id: "a", birthPlaceId: null });
    expect(patched.birthPlaceId).toBeNull();
    expect("name" in patched).toBe(false);
    expect(encode(patched)).toEqual({ id: "a", birthPlaceId: null });
  });

  it("rejects null on a non-clearable field", () => {
    expect(() => decode({ id: "a", name: null })).toThrow(Schema.SchemaError);
  });
});
