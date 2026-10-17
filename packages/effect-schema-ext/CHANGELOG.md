# @thomasfosterau/effect-schema-ext

## 0.1.0

### Minor Changes

- [#22](https://github.com/thomasfosterau/effect-schema-ext/pull/22) [`437f19f`](https://github.com/thomasfosterau/effect-schema-ext/commit/437f19f3de046529f4038dd96cc1eb4dc95c143c) Thanks [@thomasfosterau](https://github.com/thomasfosterau)! - Tested against effect 4.0.0; peer floor unchanged (`>=4.0.0-rc.118`). `Ids.make` and `Ids.refine` now type their brand identifier as `Schema.brand`'s own parameter, so they reject non-literal or union brand identifiers, matching effect 4.0.0's `Schema.brand`. Calls with a string literal (`Ids.make("PersonId")`) are unaffected; a `string` or union argument no longer compiles.

- [#2](https://github.com/thomasfosterau/effect-schema-ext/pull/2) [`136f2ae`](https://github.com/thomasfosterau/effect-schema-ext/commit/136f2ae5d6be68ab7ccf90b5514db4f1aec722fa) Thanks [@thomasfosterau](https://github.com/thomasfosterau)! - Initial release: the pure Effect Schema helpers the website, gardeneria and preferenceflow applications duplicate. Peer: `effect` `>=4.0.0-rc.118`. Every module is its own entry point and a namespace on `.`.

  - `TriState` — the update tri-state (absent = carry forward, `null` = clear, value = set) in both encodings: `clearable` (`optionalKey(OptionFromNullOr(X))`) and `clearableNullOr` (`optional(NullOr(X))`); the separating readers `read` / `readNullOr` / `match` / `toNullOr` / `toNullOrFields` for write paths; the folding readers `suppliedValue` / `suppliedNullOr` for side effects.
  - `Issues` — `pathToJsonPointer` (RFC 6901), `leaves` (a `SchemaIssue` tree flattened with its paths) and `pointers` (each leaf as a pointer, tag and formatted message, under a caller-chosen prefix).
  - `Bounded` — `NonNegative`, `pageLimit` / `PageOffset`, the `pagination` fields (explicit `maxLimit`; defaulted, or required with `defaultLimit: false`), and `idList` / `IdList` (comma-separated or repeated-key UUIDs, bounded as sent, optionally de-duplicated). The exports shared with effect-jsonapi's `FlatQuery` keep its API and behaviour.
  - `Ids` — `Uuid`, branded ids (`make`, `refine` for stacked brands), and slugs (`SLUG_PATTERN`, `Slug`, `slug`: 1–200 characters by default, optional reserved segments, as effect-jsonapi's `FlatQuery`).
  - `LiteralExact` — `tuple` / `literals`: literal tuples checked at compile time to name every member of a union and nothing else.
  - `Ast` — field traits by decode probe through the JSON codec (`acceptsNull`, `isArray`, `isDate`) and by AST (`isOptionalKey`), and `fieldTraits` over a struct's fields.

### Patch Changes

- [#19](https://github.com/thomasfosterau/effect-schema-ext/pull/19) [`33307fa`](https://github.com/thomasfosterau/effect-schema-ext/commit/33307faa26f7b33c11be7d3613a2f6ee4d1cb04e) Thanks [@thomasfosterau](https://github.com/thomasfosterau)! - Doc comments: every module overview now shows in hovers and the generated API docs (the `@copyright` tag moved after it); `Ids.make`'s doc says that the schema's `make` re-runs the UUID check and throws (pass `{ disableChecks: true }` to skip it); `Ids.refine`'s doc names the right parent brand; `Ast`'s docs state the probe readers' edge cases.

- [#19](https://github.com/thomasfosterau/effect-schema-ext/pull/19) [`5f6696c`](https://github.com/thomasfosterau/effect-schema-ext/commit/5f6696c89bf24235d420438d10b43e73c933b65c) Thanks [@thomasfosterau](https://github.com/thomasfosterau)! - The published tarball no longer includes the maintainers' `CLAUDE.md`; the README is the consumer documentation.
