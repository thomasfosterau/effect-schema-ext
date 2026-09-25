---
"@thomasfosterau/effect-schema-ext": minor
---

Initial release: the pure Effect Schema helpers the website, gardeneria and preferenceflow applications duplicate. Peer: `effect` `>=4.0.0-rc.112`. Every module is its own entry point and a namespace on `.`.

- `TriState` — the update tri-state (absent = carry forward, `null` = clear, value = set) in both encodings: `clearable` (`optionalKey(OptionFromNullOr(X))`) and `clearableNullOr` (`optional(NullOr(X))`); the separating readers `read` / `readNullOr` / `match` / `toNullOr` / `toNullOrFields` for write paths; the folding readers `suppliedValue` / `suppliedNullOr` for side effects.
- `Issues` — `pathToJsonPointer` (RFC 6901), `leaves` (a `SchemaIssue` tree flattened with its paths) and `pointers` (each leaf as a pointer, tag and formatted message, under a caller-chosen prefix).
- `Bounded` — `NonNegative`, `pageLimit` / `PageOffset`, the `pagination` fields (explicit `maxLimit`; defaulted, or required with `defaultLimit: false`), and `idList` / `IdList` (comma-separated or repeated-key UUIDs, bounded as sent, optionally de-duplicated). The exports shared with effect-jsonapi's `FlatQuery` keep its API and behaviour.
- `Ids` — `Uuid`, branded ids (`make`, `refine` for stacked brands), and slugs (`SLUG_PATTERN`, `Slug`, `slug`: 1–200 characters by default, optional reserved segments, as effect-jsonapi's `FlatQuery`).
- `LiteralExact` — `tuple` / `literals`: literal tuples checked at compile time to name every member of a union and nothing else.
- `Ast` — field traits by decode probe through the JSON codec (`acceptsNull`, `isArray`, `isDate`) and by AST (`isOptionalKey`), and `fieldTraits` over a struct's fields.
