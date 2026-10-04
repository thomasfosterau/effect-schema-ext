# Contributing

Maintained by Thomas Foster, with a workflow meant to be approachable for both humans and coding agents. Conventions are in [AGENTS.md](AGENTS.md).

## Branch model

See [AGENTS.md § Branches and pull requests](AGENTS.md#branches-and-pull-requests).

## Git hooks

Hooks are managed by Vite+; the editable [.vite-hooks/pre-commit](.vite-hooks/pre-commit) is committed. **pre-commit** runs `vp staged` (format + lint on staged files). There is no pre-push hook.

## CI expectations

CI ([ci.yml](.github/workflows/ci.yml)) runs the same gates as [AGENTS.md § Verification](AGENTS.md#verification), plus `pnpm audit --audit-level high`. [release.yml](.github/workflows/release.yml) runs changesets/action on `trunk` (see [PUBLISHING.md](PUBLISHING.md)).

## Pre-PR checklist

1. The gates in [AGENTS.md § Verification](AGENTS.md#verification), in order.
2. `git fetch origin trunk && git rebase origin/trunk`
3. Docs: the package `README.md` for any exported change; the package `CLAUDE.md` for a new term or invariant.

## Running individual checks

The gates themselves, in order, are in [AGENTS.md § Verification](AGENTS.md#verification). Narrower commands for iterating:

```sh
vp lint                                              # oxlint only
vp fmt                                               # oxfmt, writing fixes
vp run --filter ./packages/effect-schema-ext check   # the package's own type gate
vp test run tests/TriState.test.ts                   # single file (from inside the package)
```
