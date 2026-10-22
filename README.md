# effect-schema-ext

Pure [Effect Schema](https://effect.website/) helpers for the schemas every Effect application ends up writing: partial-update fields that keep "absent" and "cleared" apart, `SchemaIssue` trees rendered as RFC 6901 JSON Pointers, bounded pagination and id-list codecs, branded UUIDs and slugs, exact literal-union tuples, and field introspection by decode probe.

No JSON:API, Drizzle or application vocabulary: the prefixes, caps and reserved words an application needs are parameters, never defaults.

**Disclaimer:** this repository and its package have been created using Claude Code. The API is in flux; expect churn and breaking changes.

## Packages

| Package | Description |
| --- | --- |
| [`@thomasfosterau/effect-schema-ext`](packages/effect-schema-ext/README.md) | The helpers, one subpath per module: `TriState`, `Issues`, `Bounded`, `Ids`, `LiteralExact`, `Ast`. |

Built against `effect@4` (peer `>=4.0.0-rc.118`), published as ESM with declarations and `"sideEffects": false`.

## Install

```sh
pnpm add @thomasfosterau/effect-schema-ext effect
```

## Example

A partial-update field that tells "leave it alone" from "clear it":

```ts
import { Schema } from "effect";
import { TriState } from "@thomasfosterau/effect-schema-ext";

const UpdateNote = Schema.Struct({ id: Schema.String, summary: TriState.clearable(Schema.String) });

const cleared = Schema.decodeUnknownSync(UpdateNote)({ id: "n1", summary: null });
TriState.read(cleared.summary); // { _tag: "Clear" }

const untouched = Schema.decodeUnknownSync(UpdateNote)({ id: "n1" });
TriState.read(untouched.summary); // { _tag: "CarryForward" }
```

Every module is also its own entry point (`@thomasfosterau/effect-schema-ext/TriState`, …).

## Documentation

- [Package README](packages/effect-schema-ext/README.md) — the API reference, module by module.
- [CONTRIBUTING.md](CONTRIBUTING.md) — setup, hooks and the individual checks.
- [AGENTS.md](AGENTS.md) — repository conventions and the verification gates.
- [PUBLISHING.md](PUBLISHING.md) — the changesets release flow and its one-time setup.
- [SECURITY.md](SECURITY.md) — vulnerability reporting and the supply-chain posture.

## License

[MIT](LICENSE)
