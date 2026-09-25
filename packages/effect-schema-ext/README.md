# @thomasfosterau/effect-schema-ext

Pure [Effect Schema](https://effect.website/) helpers: the update tri-state, Schema issue → JSON Pointer, bounded list inputs, branded ids and slugs, exhaustive literal tuples, and field introspection. Extracted from the `thomasfosterau/website`, `gardeneria` and `preferenceflow` applications.

```sh
pnpm add @thomasfosterau/effect-schema-ext effect
```

Peer: `effect` `>=4.0.0-rc.112`. ESM only; every module is also its own entry point:

```ts
import { TriState } from "@thomasfosterau/effect-schema-ext";
// or
import * as TriState from "@thomasfosterau/effect-schema-ext/TriState";
```

## TriState

A partial-update field says one of three things: **absent** (carry the stored value forward), **`null`** (clear it), **a value** (set it). Folding the first two together — `col: input.col ?? null` — is silent data loss.

| Field schema | Decoded: absent | `null` | value |
| --- | --- | --- | --- |
| `TriState.clearable(X)` = `optionalKey(OptionFromNullOr(X))` | key absent | `Option.none()` | `Option.some(v)` |
| `TriState.clearableNullOr(X)` = `optional(NullOr(X))` | key absent | `null` | `v` |

Never use `Schema.OptionFromOptionalNullOr` for an update field: it decodes absent and `null` alike, so every omitted field becomes a clear.

**Separating readers** — for write paths:

- `TriState.read(field)` / `TriState.readNullOr(field)` → a `TriState<A>`: `CarryForward` | `Clear` | `Assign<A>`; fold it with `TriState.match({ onCarryForward, onClear, onAssign })`.
- `TriState.toNullOr(field)` converts the `Option` encoding to the nullable one (`undefined` / `null` / value) — what a SQL `SET` map built from the input's own keys (effect-drizzle-ext's `updateSetMap`) consumes.

```ts
import { Option, Schema } from "effect";
import { TriState } from "@thomasfosterau/effect-schema-ext";

const UpdateNote = Schema.Struct({ id: Schema.String, summary: TriState.clearable(Schema.String) });
const input = Schema.decodeUnknownSync(UpdateNote)({ id: "n1", summary: null });

TriState.read(input.summary); // { _tag: "Clear" }
TriState.toNullOr(input.summary); // null  — a clear, not a carry-forward
```

**Folding readers** — for side effects only (insert a document only when one is _set_, re-check a slug only when it changes):

- `TriState.suppliedValue(field: Option<A> | undefined): Option<A>` — the `Option` encoding.
- `TriState.suppliedNullOr(field: A | null | undefined): Option<A>` — the nullable encoding.

Both map "absent" and "clear" to `Option.none()`. Never use them to compute a column value.

## Issues

- `Issues.pathToJsonPointer(path)` — an RFC 6901 pointer (`~` → `~0`, `/` → `~1`; `[]` → `""`).
- `Issues.leaves(issue)` — a `SchemaIssue` tree flattened to `{ path, issue }` leaves: `Pointer` extends the path, `Composite` and a non-empty `AnyOf` fan out, `Filter` / `Encoding` unwrap, anything else (and an empty `AnyOf`) is a leaf.
- `Issues.pointers(issue, { prefix })` — each leaf as `{ pointer, tag, message, issue }`.

```ts
import { Effect, Schema } from "effect";
import { Issues } from "@thomasfosterau/effect-schema-ext";

const failure = Schema.decodeUnknownEffect(Schema.Struct({ name: Schema.String }))({}).pipe(
  Effect.flip,
  Effect.runSync,
);
Issues.pointers(failure.issue, { prefix: ["data", "attributes"] });
// [{ pointer: "/data/attributes/name", tag: "MissingKey", message: "Missing key", issue }]
```

The envelope is yours: a JSON:API error object is `{ status, code: tag, detail: message, source: { pointer } }` (omit `source` when `pointer` is `""`).

## Bounded

- `Bounded.NonNegative` — a finite number `>= 0`.
- `Bounded.pageLimit(max)`, `Bounded.PageLimit` (`max` = `MAX_PAGE_LIMIT` = 1000), `Bounded.PageOffset` — positive / non-negative integers.
- `Bounded.pagination({ maxLimit?, defaultLimit? })` — the `{ limit, offset }` fields, defaulting to `DEFAULT_PAGE_LIMIT` (50) and `0` on decode. website and gardeneria cap at 1000 (the default); preferenceflow at `pagination({ maxLimit: 100 })`.
- `Bounded.idList({ maxLength?, dedupe? })`, `Bounded.IdList` — a comma-separated list of UUIDs (or the repeated-key array `UrlParams.toRecord` produces), non-empty, at most `MAX_ID_LIST` (100) as sent, repeats dropped unless `dedupe: false`.

```ts
import { Schema } from "effect";
import { Bounded } from "@thomasfosterau/effect-schema-ext";

const ListPeople = Schema.Struct({
  ...Bounded.pagination({ maxLimit: 100 }),
  ids: Schema.optional(Bounded.IdList),
});
Schema.decodeUnknownSync(ListPeople)({}); // { limit: 50, offset: 0 }
```

## Ids

- `Ids.Uuid` — a string that parses as a UUID.
- `Ids.make(brand)` — `Uuid.pipe(Schema.brand(brand))`; `Ids.refine(parent, brand)` stacks a child brand (a `PersonId` is an `EntityId`, not the other way round). Brands are `Type`-side only; the wire stays `string`.
- `Ids.SLUG_PATTERN`, `Ids.Slug` — lowercase kebab-case; `Ids.slug({ maxLength?, reserved? })` adds a length bound and rejects reserved path segments. website / gardeneria's node slug is `Ids.slug({ maxLength: 200, reserved: ["create", "edit", "search", "new", "delete"] })`; preferenceflow's is `Ids.Slug`.

## LiteralExact

- `LiteralExact.tuple<U>()(values)` — compiles only when `values` names every member of `U` and nothing else; returns `values` typed as the literal tuple.
- `LiteralExact.literals<U>()(values)` — the same check, returning `Schema.Literals(values)`.
- `LiteralExact.Missing<U, T>` — the members of `U` a tuple `T` omits.

```ts
import { LiteralExact } from "@thomasfosterau/effect-schema-ext";

type Status = "draft" | "published" | "archived";
export const STATUSES = LiteralExact.tuple<Status>()(["draft", "published", "archived"]);
// LiteralExact.tuple<Status>()(["draft"]) — compile error naming "published" | "archived"
```

Use it wherever one vocabulary lives in two places that must agree — a TypeScript union and a database enum's values, a `Schema.Literals` and a lookup map's keys.

## Ast

Field traits by behavioural decode probe (through each schema's JSON codec) and, for optionality, the struct key's AST:

- `Ast.isOptionalKey(schema)`, `Ast.acceptsNull(schema)`, `Ast.isArray(schema)`, `Ast.isDate(schema)`.
- `Ast.fieldTraits(struct.fields)` → `{ key, optional, nullable, array, date }[]` in declaration order.

Build the result once at start-up; each probe builds a decoder.

## License

MIT
