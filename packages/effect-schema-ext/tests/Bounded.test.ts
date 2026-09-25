/**
 * @copyright Thomas Foster
 *
 * The bounded list-input schemas (`src/Bounded.ts`), ported from the
 * applications:
 *
 * - pagination — preferenceflow `packages/models/tests/inputs.test.ts` (the
 *   defaulted window) and website / gardeneria `ListInput` (the required
 *   window, `defaultLimit: false`), plus the pagination cases of website /
 *   gardeneria `packages/models/tests/sort.test.ts` (the `?sort=` grammar is
 *   effect-jsonapi's, not ported here);
 * - `IdList` — gardeneria `packages/models/tests/publications-model.test.ts`.
 *
 * The "FlatQuery parity" cases pin the behaviour effect-jsonapi's
 * `FlatQuery` (main, 2026-09-25) has for the same exports, so its interim
 * copies can move here as an import change.
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

describe("pageLimit / PageOffset", () => {
  it("caps a limit at the caller's maxLimit", () => {
    // preferenceflow caps its lists at 100, website and gardeneria at 1000.
    for (const [cap, over] of [
      [100, 101],
      [1000, 1001],
    ] as const) {
      expect(accepts(Bounded.pageLimit(cap), cap)).toBe(true);
      expect(accepts(Bounded.pageLimit(cap), over)).toBe(false);
    }
  });

  it("rejects a zero, negative, fractional or non-finite limit", () => {
    const Limit = Bounded.pageLimit(1000);
    expect(accepts(Limit, 0)).toBe(false);
    expect(accepts(Limit, -1)).toBe(false);
    expect(accepts(Limit, 2.5)).toBe(false);
    expect(accepts(Limit, Number.POSITIVE_INFINITY)).toBe(false);
    expect(accepts(Limit, Number.NaN)).toBe(false);
  });

  it("rejects a negative, fractional, non-finite or string offset", () => {
    expect(accepts(Bounded.PageOffset, 0)).toBe(true);
    expect(accepts(Bounded.PageOffset, -1)).toBe(false);
    expect(accepts(Bounded.PageOffset, 0.5)).toBe(false);
    expect(accepts(Bounded.PageOffset, Number.POSITIVE_INFINITY)).toBe(false);
    expect(accepts(Bounded.PageOffset, "0")).toBe(false);
  });

  it("has no default page cap", () => {
    // packages/effect-schema-ext/CLAUDE.md: a page cap is a parameter, never a default.
    expect(Object.keys(Bounded)).not.toContain("PageLimit");
    expect(Object.keys(Bounded)).not.toContain("MAX_PAGE_LIMIT");
  });
});

describe("pagination — defaulted window", () => {
  const PaginationInput = Schema.Struct(Bounded.pagination({ maxLimit: 100 }));
  const decode = Schema.decodeUnknownSync(PaginationInput);

  it("defaults offset and limit when omitted", () => {
    expect(decode({})).toEqual({ offset: 0, limit: Bounded.DEFAULT_PAGE_LIMIT });
    expect(Bounded.DEFAULT_PAGE_LIMIT).toBe(50);
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

  it("honours a caller-chosen default", () => {
    const Twenty = Schema.Struct(Bounded.pagination({ maxLimit: 1000, defaultLimit: 20 }));
    expect(Schema.decodeUnknownSync(Twenty)({})).toEqual({ offset: 0, limit: 20 });
    expect(accepts(Twenty, { limit: 1000 })).toBe(true);
    expect(accepts(Twenty, { limit: 1001 })).toBe(false);
  });

  it("merges alongside a list input's own filters", () => {
    const List = Schema.Struct({
      ...Bounded.pagination({ maxLimit: 100 }),
      slug: Schema.optional(Schema.String),
    });
    expect(Schema.decodeUnknownSync(List)({ limit: 10, slug: "a-slug" })).toEqual({
      offset: 0,
      limit: 10,
      slug: "a-slug",
    });
  });
});

describe("pagination — required window (defaultLimit: false)", () => {
  // website / gardeneria `ListInput`: the bracket-paginated wire query always
  // carries both keys, so the decoded input has no defaults (SEC-INPUT-003).
  const List = Schema.Struct(Bounded.pagination({ maxLimit: 1000, defaultLimit: false }));

  it("requires both keys", () => {
    expect(accepts(List, {})).toBe(false);
    expect(accepts(List, { limit: 10 })).toBe(false);
    expect(accepts(List, { offset: 0 })).toBe(false);
    expect(Schema.decodeUnknownSync(List)({ offset: 0, limit: 10 })).toEqual({
      offset: 0,
      limit: 10,
    });
  });

  it("still bounds both keys", () => {
    expect(accepts(List, { offset: 0, limit: 1001 })).toBe(false);
    expect(accepts(List, { offset: -1, limit: 10 })).toBe(false);
  });
});

describe("FlatQuery parity", () => {
  it("pagination decodes offset before limit, as FlatQuery does", () => {
    const decoded = Schema.decodeUnknownSync(Schema.Struct(Bounded.pagination({ maxLimit: 100 })))(
      {},
    );
    expect(Object.keys(decoded)).toEqual(["offset", "limit"]);
  });

  it("the id-list bound is FlatQuery's DEFAULT_MAX_ID_LIST", () => {
    expect(Bounded.DEFAULT_MAX_ID_LIST).toBe(100);
  });

  it("IdList keeps repeats by default, as FlatQuery's does", () => {
    expect(Schema.decodeUnknownSync(Bounded.IdList)(`${A},${A}`)).toEqual([A, A]);
  });

  it("IdList re-encodes to exactly the wire value it decoded", () => {
    const decoded = Schema.decodeUnknownSync(Bounded.IdList)(`${B},${A},${B}`);
    expect(Schema.encodeSync(Bounded.IdList)(decoded)).toBe(`${B},${A},${B}`);
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
    const many = Array.from({ length: Bounded.DEFAULT_MAX_ID_LIST + 1 }, () => A).join(",");
    expect(accepts(Bounded.IdList, many)).toBe(false);
    const most = Array.from({ length: Bounded.DEFAULT_MAX_ID_LIST }, () => A).join(",");
    expect(accepts(Bounded.IdList, most)).toBe(true);
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

describe("idList({ dedupe: true })", () => {
  const Deduped = Bounded.idList({ dedupe: true });

  it("drops repeated ids, keeping first-occurrence order", () => {
    expect(Schema.decodeUnknownSync(Deduped)(`${B},${A},${B}`)).toEqual([B, A]);
  });

  it("encodes the de-duplicated list back to the wire string", () => {
    expect(Schema.encodeSync(Deduped)([B, A])).toBe(`${B},${A}`);
  });

  it("checks the bound on the list as sent, before dropping repeats", () => {
    const Two = Bounded.idList({ maxLength: 2, dedupe: true });
    expect(accepts(Two, `${A},${A},${A}`)).toBe(false);
    expect(Schema.decodeUnknownSync(Two)(`${A},${A}`)).toEqual([A]);
  });
});
