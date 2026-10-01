# Contributing

Maintained by Thomas Foster, with a workflow meant to be approachable for both humans and coding agents. Conventions are in [AGENTS.md](AGENTS.md).

## Branch model

See [AGENTS.md § Branches and pull requests](AGENTS.md#branches-and-pull-requests).

## Git hooks

Hooks are managed by Vite+; the editable [.vite-hooks/pre-commit](.vite-hooks/pre-commit) is committed. **pre-commit** runs `vp staged` (format + lint on staged files). There is no pre-push hook.

## CI expectations

CI ([ci.yml](.github/workflows/ci.yml)) runs the same gates as [AGENTS.md § Verification](AGENTS.md#verification), plus `pnpm audit --audit-level high`. [release.yml](.github/workflows/release.yml) runs changesets/action on `main` (see [PUBLISHING.md](PUBLISHING.md)). [effect-canary.yml](.github/workflows/effect-canary.yml) re-runs the type, test, build and docgen gates weekly against `effect@rc` and files an issue when they go red.

## Pre-PR checklist

1. The gates in [AGENTS.md § Verification](AGENTS.md#verification), in order.
2. `git fetch origin main && git rebase origin/main`
3. Docs: the package `README.md` for any exported change; the package `CLAUDE.md` for a new term or invariant.

## Running individual checks

```sh
vp lint                                              # oxlint
vp fmt                                               # oxfmt
vp run check                                         # the whole type gate (builds dist/ for the dist-consumer check)
vp run --filter ./packages/effect-schema-ext check   # the package's own type gate
vp run -r test:unit                                  # unit tests
vp test run tests/TriState.test.ts                   # single file (from inside the package)
vp run -r build                                      # emit dist/
vp run test:coverage                                 # one Istanbul map for fallow
vp run docgen                                        # examples + API reference
vp run fallow:audit                                  # change-set review (not a CI gate)
```
