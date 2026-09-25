/**
 * @copyright Thomas Foster
 *
 * The bounded list-input schemas (`src/Bounded.ts`), ported from the
 * applications:
 *
 * - pagination — preferenceflow `packages/models/tests/inputs.test.ts` and the
 *   pagination cases of website / gardeneria `packages/models/tests/sort.test.ts`
 *   (the `?sort=` grammar itself is effect-jsonapi's, not ported here);
 * - `IdList` — gardeneria `packages/models/tests/publications-model.test.ts`.
 *
 * @module tests/Bounded
 */

import { describe, expect, it } from "vite-plus/test";
import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";
import { Bounded } from "@thomasfosterau/effect-schema-ext";

const A = "00000000-0000-4000-8000-000000000000";
const B = "00000000-0000-4000-8000-000000000001";

const accepts = (schema: Schema.Codec<unknown, unknown, never, never>, value: unknown): boolean =>
  Exit.isSuccess(Schema.decodeUnknownExit(schema)(value));

describe("NonNegative", () => {
  it("allows zero and rejects negatives and non-finite values", () => {
    expect(accepts(Bounded.NonNegative, 0)).toBe(true);
    expect(accepts(Bounded.NonNegative, 2.5)).toBe(true);
    expect(accepts(Bounded.NonNegative, -1)).toBe(false);
    expect(accepts(Bounded.NonNegative, Number.POSITIVE_INFINITY)).toBe(false);
    expect(accepts(Bounded.NonNegative, Number.NaN)).toBe(false);
  });
});

describe("PageLimit / PageOffset", () => {
  it("caps the default page size at MAX_PAGE_LIMIT", () => {
    expect(Bounded.MAX_PAGE_LIMIT).toBe(1000);
    expect(Bounded.DEFAULT_PAGE_LIMIT).toBeLessThanOrEqual(Bounded.MAX_PAGE_LIMIT);
    expect(accepts(Bounded.PageLimit, Bounded.MAX_PAGE_LIMIT)).toBe(true);
    expect(accepts(Bounded.PageLimit, Bounded.MAX_PAGE_LIMIT + 1)).toBe(false);
  });

  it("rejects a zero, negative, fractional or non-finite limit", () => {
    expect(accepts(Bounded.PageLimit, 0)).toBe(false);
    expect(accepts(Bounded.PageLimit, -1)).toBe(false);
    expect(accepts(Bounded.PageLimit, 2.5)).toBe(false);
    expect(accepts(Bounded.PageLimit, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("rejects a negative, fractional or string offset", () => {
    expect(accepts(Bounded.PageOffset, 0)).toBe(true);
    expect(accepts(Bounded.PageOffset, -1)).toBe(false);
    expect(accepts(Bounded.PageOffset, 0.5)).toBe(false);
    expect(accepts(Bounded.PageOffset, "0")).toBe(false);
  });

  it("builds a limit with a caller-chosen cap", () => {
    // preferenceflow caps its lists at 100, website and gardeneria at 1000.
    const Limit = Bounded.pageLimit(100);
    expect(accepts(Limit, 100)).toBe(true);
    expect(accepts(Limit, 101)).toBe(false);
  });
});

describe("pagination", () => {
  const PaginationInput = Schema.Struct(Bounded.pagination({ maxLimit: 100 }));
  const decode = Schema.decodeUnknownSync(PaginationInput);

  it("defaults offset and limit when omitted", () => {
    expect(decode({})).toEqual({ offset: 0, limit: Bounded.DEFAULT_PAGE_LIMIT });
  });

  it("accepts a bounded window", () => {
    expect(decode({ offset: 200, limit: 100 })).toEqual({ offset: 200, limit: 100 });
  });

  it("rejects an unbounded, zero, negative or fractional window", () => {
    expect(() => decode({ limit: 101 })).toThrow();
    expect(() => decode({ limit: 0 })).toThrow();
    expect(() => decode({ limit: 2.5 })).toThrow();
    expect(() => decode({ offset: -1 })).toThrow();
    expect(() => decode({ offset: 0.5 })).toThrow();
  });

  it("honours a caller-chosen default and falls back to MAX_PAGE_LIMIT as the cap", () => {
    const Wide = Schema.Struct(Bounded.pagination({ defaultLimit: 20 }));
    expect(Schema.decodeUnknownSync(Wide)({})).toEqual({ offset: 0, limit: 20 });
    expect(accepts(Wide, { limit: Bounded.MAX_PAGE_LIMIT })).toBe(true);
    expect(accepts(Wide, { limit: Bounded.MAX_PAGE_LIMIT + 1 })).toBe(false);
  });

  it("merges alongside a list input's own filters", () => {
    const List = Schema.Struct({
      ...Bounded.pagination(),
      slug: Schema.optional(Schema.String),
    });
    expect(Schema.decodeUnknownSync(List)({ limit: 10, slug: "a-slug" })).toEqual({
      limit: 10,
      offset: 0,
      slug: "a-slug",
    });
  });
});

describe("IdList — the filter[ids] codec", () => {
  const decode = Schema.decodeUnknownSync(Bounded.IdList);

  it("decodes a comma-separated string", () => {
    expect(decode(`${A},${B}`)).toEqual([A, B]);
  });

  it("decodes a repeated query key, which UrlParams reports as an array", () => {
    // `effect/unstable/http`'s `UrlParams.toRecord` maps a key seen once to a
    // string and a repeated key to an array; a schema accepting only one of
    // the two 400s on a perfectly ordinary request.
    expect(decode([A, B])).toEqual([A, B]);
  });

  it("refuses an empty list and a non-UUID member", () => {
    // An empty list would render as `id IN ()`, which Postgres rejects.
    expect(accepts(Bounded.IdList, "")).toBe(false);
    expect(accepts(Bounded.IdList, [])).toBe(false);
    expect(accepts(Bounded.IdList, `${A},nonsense`)).toBe(false);
  });

  it("is bounded, so a hostile filter cannot drive an arbitrarily wide IN", () => {
    const many = Array.from({ length: Bounded.MAX_ID_LIST + 1 }, () => A).join(",");
    expect(accepts(Bounded.IdList, many)).toBe(false);
    const most = Array.from({ length: Bounded.MAX_ID_LIST }, () => A).join(",");
    expect(accepts(Bounded.IdList, most)).toBe(true);
  });

  it("drops repeated ids, keeping first-occurrence order", () => {
    expect(decode(`${B},${A},${B}`)).toEqual([B, A]);
  });

  it("keeps repeats and round-trips the wire value with dedupe: false", () => {
    const Raw = Bounded.idList({ dedupe: false });
    const decoded = Schema.decodeUnknownSync(Raw)(`${A},${A}`);
    expect(decoded).toEqual([A, A]);
    expect(Schema.encodeSync(Raw)(decoded)).toBe(`${A},${A}`);
  });

  it("keeps the bound on the decoded side too, so encoding an empty list fails", () => {
    expect(Schema.is(Schema.toType(Bounded.IdList))([])).toBe(false);
    expect(Schema.is(Schema.toType(Bounded.IdList))([A])).toBe(true);
    expect(() => Schema.encodeUnknownSync(Bounded.IdList)([])).toThrow();
  });

  it("encodes back to the comma-separated wire string", () => {
    expect(Schema.encodeSync(Bounded.IdList)([A, B])).toBe(`${A},${B}`);
  });

  it("takes a caller-chosen bound", () => {
    const Two = Bounded.idList({ maxLength: 2 });
    expect(accepts(Two, `${A},${B}`)).toBe(true);
    expect(accepts(Two, `${A},${B},${A}`)).toBe(false);
  });
});
