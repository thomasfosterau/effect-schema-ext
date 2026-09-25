/**
 * @copyright Thomas Foster
 *
 * The identifier schemas (`src/Ids.ts`). The slug cases are ported from
 * website / gardeneria `packages/models/tests/node-slug.test.ts` (their `Slug`
 * is `slug({ maxLength: 200, reserved: [...] })` here); the brand's
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
  it("accepts kebab-case of any length and rejects the malformed", () => {
    expect(Schema.is(Ids.Slug)("anthony-albanese")).toBe(true);
    expect(Schema.is(Ids.Slug)("a".repeat(500))).toBe(true);
    expect(Schema.is(Ids.Slug)("My-Post")).toBe(false);
    expect(Schema.is(Ids.Slug)("")).toBe(false);
  });

  it("exposes the pattern for route matchers", () => {
    expect(Ids.SLUG_PATTERN.test("nsw")).toBe(true);
    expect(Ids.SLUG_PATTERN.test("house-of-representatives")).toBe(true);
    expect(Ids.SLUG_PATTERN.test("-x")).toBe(false);
  });
});

describe("slug({ maxLength: 200, reserved }) — the node slug", () => {
  const Slug = Ids.slug({
    maxLength: 200,
    reserved: ["create", "edit", "search", "new", "delete"],
  });
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
});
