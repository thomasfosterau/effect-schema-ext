/**
 * @copyright Thomas Foster
 *
 * The runtime half of `src/LiteralExact.ts`: `tuple` returns its argument
 * unchanged and `literals` builds the matching `Schema.Literals`. The
 * compile-time half — exhaustiveness and no extras — is `LiteralExact.types.ts`.
 *
 * @module tests/LiteralExact
 */

import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";
import { LiteralExact } from "@thomasfosterau/effect-schema-ext";

type Status = "draft" | "published" | "archived";

describe("tuple", () => {
  it("returns the values unchanged, in order", () => {
    const values = ["draft", "published", "archived"] as const;
    expect(LiteralExact.tuple<Status>()(values)).toBe(values);
  });
});

describe("literals", () => {
  const StatusSchema = LiteralExact.literals<Status>()(["draft", "published", "archived"]);

  it("accepts exactly the union's members", () => {
    expect(Schema.is(StatusSchema)("draft")).toBe(true);
    expect(Schema.is(StatusSchema)("archived")).toBe(true);
    expect(Schema.is(StatusSchema)("deleted")).toBe(false);
  });

  it("keeps the literal list on the schema", () => {
    expect(StatusSchema.literals).toEqual(["draft", "published", "archived"]);
  });

  it("works for numeric literal unions", () => {
    const Level = LiteralExact.literals<1 | 2 | 3>()([1, 2, 3]);
    expect(Schema.is(Level)(2)).toBe(true);
    expect(Schema.is(Level)(4)).toBe(false);
  });
});
