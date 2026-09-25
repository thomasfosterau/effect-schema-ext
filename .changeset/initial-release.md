---
"@thomasfosterau/effect-schema-ext": minor
---

Initial release: the pure Effect Schema helpers the website, gardeneria and preferenceflow applications duplicate. Peer: `effect` `>=4.0.0-rc.112`. Every module is its own entry point and a namespace on `.`.

- `TriState` — the update tri-state (absent = carry forward, `null` = clear, value = set) in both encodings: `clearable` (`optionalKey(OptionFromNullOr(X))`) and `clearableNullOr` (`optional(NullOr(X))`); the separating readers `read` / `readNullOr` / `match` / `toNullOr` for write paths; the folding readers `suppliedValue` / `suppliedNullOr` for side effects.
- `Issues` — `pathToJsonPointer` (RFC 6901), `leaves` (a `SchemaIssue` tree flattened with its paths) and `pointers` (each leaf as a pointer, tag and formatted message, under a caller-chosen prefix).
- `Bounded` — `NonNegative`, `pageLimit` / `PageLimit` / `PageOffset`, the defaulted `pagination` fields, and `idList` / `IdList` (comma-separated or repeated-key UUIDs, bounded as sent, de-duplicated).
- `Ids` — `Uuid`, branded ids (`make`, `refine` for stacked brands), and slugs (`SLUG_PATTERN`, `Slug`, `slug` with a length bound and reserved segments).
- `LiteralExact` — `tuple` / `literals`: literal tuples checked at compile time to name every member of a union and nothing else.
- `Ast` — field traits by decode probe through the JSON codec (`acceptsNull`, `isArray`, `isDate`) and by AST (`isOptionalKey`), and `fieldTraits` over a struct's fields.
