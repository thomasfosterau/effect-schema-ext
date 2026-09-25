# effect-schema-ext

`@thomasfosterau/effect-schema-ext`: pure [Effect Schema](https://effect.website/) helpers, extracted from the `thomasfosterau/website`, `thomasfosterau/gardeneria` and `thomasfosterau/preferenceflow` applications, where each was duplicated.

| Module | What it is |
| --- | --- |
| [`TriState`](packages/effect-schema-ext/README.md#tristate) | The update tri-state (absent = carry forward, `null` = clear, value = set): the two field encodings and the readers that keep — or deliberately fold — the three states. |
| [`Issues`](packages/effect-schema-ext/README.md#issues) | A `SchemaIssue` tree flattened to its leaves and rendered as RFC 6901 JSON Pointers. |
| [`Bounded`](packages/effect-schema-ext/README.md#bounded) | Bounded pagination (`pageLimit`, `PageOffset`, `pagination` — the cap is always the caller's), the comma-separated UUID `IdList`, `NonNegative`. |
| [`Ids`](packages/effect-schema-ext/README.md#ids) | `Uuid`, branded-UUID ids (`make`, `refine`), and slugs (`SLUG_PATTERN`, `Slug`, `slug`). |
| [`LiteralExact`](packages/effect-schema-ext/README.md#literalexact) | Literal tuples checked at compile time to cover a union exactly. |
| [`Ast`](packages/effect-schema-ext/README.md#ast) | Field introspection by AST and behavioural decode probe (optional / nullable / array / date). |

Built against `effect@4.0.0-rc` (peer `>=4.0.0-rc.112`), published as ESM with declarations, `sideEffects: false`.

**Disclaimer:** this repository and its package have been created using Claude Code. The API is in flux; expect churn and breaking changes.

## Documentation

The [package README](packages/effect-schema-ext/README.md) is the API reference; [AGENTS.md](AGENTS.md) carries repository conventions, [CONTRIBUTING.md](CONTRIBUTING.md) the pre-PR checklist, [PUBLISHING.md](PUBLISHING.md) the release pipeline and [SECURITY.md](SECURITY.md) the vulnerability-reporting policy.

## License

[MIT](LICENSE)
