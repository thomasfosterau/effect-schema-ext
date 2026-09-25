/**
 * @copyright Thomas Foster
 *
 * The identifier schemas (`src/Ids.ts`). The slug cases are ported from
 * website / gardeneria `packages/models/tests/node-slug.test.ts` (their `Slug`
 * is `slug({ reserved: [...] })` here, whose default bound is their 200); the brand's
 * compile-time guarantees are in `Ids.types.ts`.
 *
 * @module tests/Ids
 */

import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";
import { Ids } from "@thomasfosterau/effect-schema-ext";

const UUID = "5f0c3f9a-8a18-4f6e-9b2e-7a8a1b2c3d4e";

describe("Uuid", () => {
  it("accepts a UUID and rejects anything else", () => {
    expect(Schema.decodeUnknownSync(Ids.Uuid)(UUID)).toBe(UUID);
    expect(Schema.is(Ids.Uuid)("not-a-uuid")).toBe(false);
    expect(Schema.is(Ids.Uuid)("")).toBe(false);
    expect(Schema.is(Ids.Uuid)(42)).toBe(false);
  });
});

describe("make / refine — branded UUID ids", () => {
  const EntityId = Ids.make("EntityId");
  const PersonId = Ids.refine(EntityId, "PersonId");

  it("decodes a UUID and keeps the plain string on the wire", () => {
    const decoded = Schema.decodeUnknownSync(PersonId)(UUID);
    expect(decoded).toBe(UUID);
    expect(Schema.encodeSync(PersonId)(decoded)).toBe(UUID);
  });

  it("still validates the UUID under every stacked brand", () => {
    expect(Schema.is(EntityId)("nope")).toBe(false);
    expect(Schema.is(PersonId)("nope")).toBe(false);
  });

  it("brands a trusted value without re-parsing through make", () => {
    expect(PersonId.make(UUID)).toBe(UUID);
  });
});

describe("Slug", () => {
  it("accepts kebab-case up to 200 characters and rejects the malformed", () => {
    expect(Schema.is(Ids.Slug)("anthony-albanese")).toBe(true);
    expect(Schema.is(Ids.Slug)("a".repeat(200))).toBe(true);
    expect(Schema.is(Ids.Slug)("a".repeat(201))).toBe(false);
    expect(Schema.is(Ids.Slug)("My-Post")).toBe(false);
    expect(Schema.is(Ids.Slug)("")).toBe(false);
  });

  it("reserves nothing", () => {
    expect(Schema.is(Ids.Slug)("edit")).toBe(true);
  });

  it("exposes the pattern for route matchers", () => {
    expect(Ids.SLUG_PATTERN.test("nsw")).toBe(true);
    expect(Ids.SLUG_PATTERN.test("house-of-representatives")).toBe(true);
    expect(Ids.SLUG_PATTERN.test("-x")).toBe(false);
  });
});

describe("slug({ reserved }) — the node slug", () => {
  // website / gardeneria `node-slug.ts`: 1–200 characters (the default bound)
  // and the static sibling routes reserved.
  const Slug = Ids.slug({ reserved: ["create", "edit", "search", "new", "delete"] });
  const decode = Schema.decodeUnknownSync(Slug);

  it("accepts a lowercase kebab-case slug", () => {
    expect(decode("my-post-title")).toBe("my-post-title");
  });

  it("accepts a single-segment slug", () => {
    expect(decode("hello")).toBe("hello");
  });

  it("rejects uppercase characters", () => {
    expect(() => decode("My-Post")).toThrow();
  });

  it("rejects spaces", () => {
    expect(() => decode("my post")).toThrow();
  });

  it("rejects a leading hyphen", () => {
    expect(() => decode("-my-post")).toThrow();
  });

  it("rejects a trailing hyphen", () => {
    expect(() => decode("my-post-")).toThrow();
  });

  it("rejects consecutive hyphens", () => {
    expect(() => decode("my--post")).toThrow();
  });

  it("rejects an empty string", () => {
    expect(() => decode("")).toThrow();
  });

  it("rejects a slug over 200 characters", () => {
    expect(() => decode("a".repeat(201))).toThrow();
  });

  it("accepts a slug at the 200-character bound", () => {
    const slug = "a".repeat(200);
    expect(decode(slug)).toBe(slug);
  });

  it.each(["create", "edit", "search", "new", "delete"])(
    'rejects the reserved path segment "%s"',
    (reserved) => {
      expect(() => decode(reserved)).toThrow(/reserved path segment/);
    },
  );

  it("reports the pattern mismatch in words", () => {
    expect(() => decode("My-Post")).toThrow(/lowercase letters, numbers, and hyphens/);
  });

  it("reserves nothing by default", () => {
    expect(Schema.is(Ids.slug())("edit")).toBe(true);
  });

  it("takes a caller-chosen bound", () => {
    expect(Schema.is(Ids.slug({ maxLength: 5 }))("abcde")).toBe(true);
    expect(Schema.is(Ids.slug({ maxLength: 5 }))("abcdef")).toBe(false);
  });
});

describe("FlatQuery parity", () => {
  it("defaults the slug bound to 200, as FlatQuery.slug does", () => {
    expect(Ids.DEFAULT_MAX_SLUG_LENGTH).toBe(200);
    expect(Schema.is(Ids.slug())("a".repeat(200))).toBe(true);
    expect(Schema.is(Ids.slug())("a".repeat(201))).toBe(false);
  });

  it("reports the length bound with isLengthBetween's wire message", () => {
    // FlatQuery.slug checks `Schema.isLengthBetween(1, maxLength)`; the message
    // a client sees for an over-long or empty slug must be the same.
    const expected = /Expected a value with a length between 1 and 200/;
    expect(() => Schema.decodeUnknownSync(Ids.Slug)("a".repeat(201))).toThrow(expected);
    expect(() => Schema.decodeUnknownSync(Ids.Slug)("")).toThrow(expected);
  });

  it("uses FlatQuery's pattern and messages", () => {
    expect(Ids.SLUG_PATTERN.source).toBe("^[a-z0-9]+(?:-[a-z0-9]+)*$");
    expect(() => Schema.decodeUnknownSync(Ids.Slug)("Not A Slug")).toThrow(
      'must be lowercase letters, numbers, and hyphens (e.g. "my-post-title")',
    );
    expect(() => Schema.decodeUnknownSync(Ids.slug({ reserved: ["edit"] }))("edit")).toThrow(
      '"edit" is a reserved path segment and cannot be used as a slug',
    );
  });
});
