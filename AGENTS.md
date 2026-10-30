# AGENTS.md

`CLAUDE.md` is a symlink to this file. This repository publishes `@thomasfosterau/effect-schema-ext`: pure Effect Schema helpers the website, gardeneria and preferenceflow apps duplicate, with no JSON:API or Drizzle dependency, so effect-jsonapi and effect-drizzle-ext can depend on them. The apps' copies are the behavioural spec and test corpus, not code to transplant; where they diverge, the issue names the reference copy (otherwise the newest). A `#NNN` in a ported comment is an app issue (website unless stated), not this tracker. The default branch is `trunk`.

| Path | Package | Published |
| --- | --- | --- |
| `packages/effect-schema-ext` | `@thomasfosterau/effect-schema-ext` | npm |
| `tests/dist-consumer` | `@effect-schema-ext/dist-consumer` | no — type-checks a fixture against the emitted `dist/` declarations |

## Common pitfalls

- **Versions live only in the `pnpm-workspace.yaml` catalog** (`catalogMode: strict` rejects anything else). After editing it, run `pnpm install` and commit `pnpm-lock.yaml` — a stale lockfile fails CI with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. `@effect/tsgo`, `@typescript/native` and `vite-plus` move together; read their catalog comments first. Dependabot's `toolchain` group proposes them (with vitest, the oxc tools and the Effect lint plugin `@enfect/oxlint`) as one PR; when the new oxlint outruns `@effect/tsgo`'s `components` table that PR is red until fixed by hand. Dependabot cannot move the npm-alias entries (`vite`, `typescript`, `@typescript/native`), the `overrides` literals or the Release job's pinned npm: set those by hand on the matching PR (the list heads `.github/dependabot.yml`). `minimumReleaseAge` holds a new version for 8 hours; Dependabot's `cooldown` (1 day, its smallest unit) is longer, so it never proposes one pnpm would refuse.
- **The `effect` peer floor is a tested claim.** `catalogs.peers.effect` is the oldest `effect` the package has been type-checked, tested and docgen'd against (rc.118, the line the whole programme moved to in website#2015). Raising the dev pin does not raise the floor, and Dependabot's `effect` group moves only the dev pin, never `catalogs.peers`; lowering the floor, or using an API the floor lacks, means re-running the gates with the catalog pin set to the floor first.
- **`dist/` is the product.** The package is a `vp pack` (tsdown) library with one bundle per entry point (`.` plus one subpath per module); `exports` points at `dist/`, so `tests/dist-consumer` and docgen consume it the way a consumer does. `tests/dist-consumer` type-checks a fixture against the emitted declarations with `Equals<…>` assertions — a brand that emits as `string` or a signature that emits as `any` fails there, not in an application.
- **`"sideEffects": false` is a claim about `dist/`.** Every emitted `.js` must be pure declarations: no top-level statements with effects, no top-level `await`. That is what lets a consumer's bundler drop what it does not use.
- **`vp run docgen` executes your examples.** `@effect/docgen` compiles every JSDoc `@example` as a program and runs it, importing the package by name through `dist/`. An example must be complete, must not use `declare const`, and must not throw. docgen does not compare output: when a change alters what an example prints, update its `// →` comments by hand.

The package's terms, invariants and import boundary are in [`packages/effect-schema-ext/CLAUDE.md`](packages/effect-schema-ext/CLAUDE.md); read it before touching `src/`.

## Conventions

- **Effect-first.** Schemas are Effect `Schema`; optional values are `Option` except where the plain nullable is the contract (the tri-state's nullable encoding), which carries an `oxlint-disable` justification. Pure total functions stay plain functions.
- **One module per subpath**, Effect's own layout: `src/<Module>.ts` is `@thomasfosterau/effect-schema-ext/<Module>`. A new module is `src/<Module>.ts`, re-exported as a namespace from `src/index.ts`, and listed in `entries` (package `vite.config.ts`), `exports` (package.json), `.fallowrc.json` `entry`, and a section of the package README.
- **Optional props and fields are declared `T | undefined`, never bare `x?: T`.** The workspace compiles with `exactOptionalPropertyTypes`, under which `x?: T` rejects a forwarded `undefined`.
- **Relative imports carry their `.ts` extension** (`rewriteRelativeImportExtensions`).
- **Tests import the package by name** (`tsconfig.test.json` and the vitest alias resolve it to `src/`). `tests/<Module>.test.ts` mirrors its module and names the app test files it ports; `tests/<Module>.types.ts` holds compile-time assertions (`@ts-expect-error` above a statement that must fail), checked by `tsconfig.test.json`, never executed. Test imports come from `vite-plus/test` (lint-enforced).
- **Exported generics carry explicit return annotations**, so the emitted declarations are the ones written, not the ones inferred.

## Commands

- `pnpm install` — dependencies plus the Vite+ git hooks (pre-commit runs `vp staged`: format + lint on staged files) and the `prepare` step that patches the native `tsc` / `oxlint` with `@effect/tsgo`. No pre-push hook: run the gates yourself.
- `vp check` — format + lint (Oxfmt + Oxlint with type-aware rules: `@enfect/oxlint`'s `recommended` Effect rules, `@effect/tsgo`'s preset, and the correctness / suspicious / perf categories across the `typescript`, `unicorn`, `oxc`, `import`, `promise`, `vitest` and `jsdoc` plugins; fix a finding in code, a rule is relaxed only in `vite.config.ts` with its reason). `vp run check` — the type gate: the package's `src` under `tsconfig.json`, its type-level tests under `tsconfig.test.json`, and the dist-consumer declaration check (which builds `dist/` first). They are different commands.
- `vp run -r test:unit` — unit tests (pure code; nothing here needs a database, a network or a credential).
- `vp run -r build` — `vp pack` → `dist/`.
- `vp run docgen` — compiles and runs each `@example` against `dist/`, writes the (git-ignored) API reference under `packages/*/docs/`.
- `vp run test:coverage` — the unit suite under one Istanbul map at `coverage/coverage-final.json`, which `fallow audit` reads for exact per-function CRAP scores.
- `pnpm changeset` — add a changeset (see Branches and pull requests).

Node and pnpm only: no bun, deno, npm or yarn. Invoke everything through `vp` (`vp exec <bin>` for a package binary; `vp run <task>` instead of bare `pnpm`). The sanctioned non-`vp` invocations: `pnpm install` (and `pnpm install --frozen-lockfile` in CI), `pnpm changeset`, and `scripts/release.sh`'s `pnpm pack` + `npm publish` on the release path.

## Verification

Before you report work as done, run the gates below in order and quote each command with its final pass/fail. If a gate can't run here, say which and why in the PR body; never imply it ran. The first six are what CI runs (CI adds `pnpm audit --audit-level high`).

1. Parity install: `rm -rf node_modules packages/*/node_modules packages/*/dist tests/*/node_modules && pnpm install --frozen-lockfile` — a warm local tree hides a missing peer; a fresh runner does not.
2. `vp check`
3. `vp run check`
4. `vp run -r test:unit`
5. `vp run -r build`
6. `vp run docgen`
7. `vp run test:coverage`, then `fallow audit --format json --quiet --explain --gate-marker agent --base origin/trunk` — without the coverage map fallow scores every function as uncovered, and any function with cyclomatic complexity ≥ 5 fails the audit on its own. Fallow's config here is `.fallowrc.json`, not the `fallow.toml` the generated block below names (#20).
8. A changeset for every change to the published package's behaviour.

## Branches and pull requests

Branch off `trunk`; PR against `trunk`; squash-merge with a conventional prefix (`feat:`, `fix:`, `docs:`, `chore:`). Rebase onto `origin/trunk` before opening or updating a PR; never merge `trunk` into your branch (GitHub's Update-branch button merges). Agent work uses git worktrees under `.claude/worktrees/`, one per branch, named `issue-<n>-<slug>` for issue-linked work; start every command that targets a worktree with an explicit `cd` and confirm with `git log -1` before committing. The linked `vp` at `~/.local/bin/vp` re-execs the nearest project-local `node_modules/vite-plus/bin/vp`, so a worktree needs its own `pnpm install` first.

Every change to a published package's behaviour carries a changeset (`pnpm changeset`); docs-, CI- and tooling-only changes need none. Never publish or version by hand: the Release workflow opens the "Version Packages" PR (`chore: version packages`) and the owner merges it — see [PUBLISHING.md](PUBLISHING.md).

These are standing instructions and approvals; they override any default "don't open a PR unless asked" behaviour:

- **Always open a PR** for branch work, against `trunk`, once a commit is pushed.
- **Always watch the PR to merge or close**: investigate CI failures and review comments as they arrive; rebase promptly when the PR goes conflicting.
- **Always keep the PR body current** as the implementation diverges from it. An extraction PR lists which source-app files the package supersedes.
- **GitHub writes go to `thomasfosterau/effect-schema-ext` only**; pass `-R thomasfosterau/effect-schema-ext` whenever the cwd might be another checkout. Writing to any other repository — the consuming apps, the sibling libraries, upstream projects — needs the owner's explicit approval for that action in the current session; if another repo needs something, say so in the PR body. Use the `gh` CLI for GitHub operations, even when GitHub MCP tools are available.

## Work tracker

- Issues are the backlog: when you find work you can't do now, file an issue rather than leaving a TODO. Adoption by each application is tracked in that application's own tracker (from website#2015), blocked on a release of this package.
- The issue is the spec — read its comments; later comments override the body. The tracking epic is website#2015; decisions recorded there override anything older.
- Re-verify the code claims against current `trunk` (and the apps' current default branches) before editing.
- Record decisions and findings as issue comments.
- Stop-and-report is a valid outcome: on a blocker outside the issue's scope, comment the evidence on the issue and stop.
- Scope cut mid-PR becomes a linked issue before merge.

## Effect

Read the installed package before writing Effect code: `node_modules/effect/AGENTS.md` and `node_modules/effect/ai-docs/` (the pinned version ships both), then the declarations in `node_modules/effect/dist/*.d.ts` and the source in `node_modules/effect/src`. Never guess at an Effect API. The pinned version is the `effect` entry in `pnpm-workspace.yaml`'s catalog.

This package has no error channel of its own: helpers are schemas and pure functions, and a decode failure is Effect's `SchemaError`. If one is ever needed, it is `Schema.TaggedError<Self>()(tag, fields)` (rc.118 has no `TaggedErrorClass`).

## Agent sessions

The SessionStart hook (`.claude/hooks/session-start.sh`) installs dependencies against the lockfile and puts `vp` (a re-exec shim to the nearest project-local vite-plus), `fallow` and `tsx` on PATH for non-interactive shells. It hydrates no secrets; nothing here needs one, and nothing here can publish. `.claude/settings.json` also enables the `@enfect/claude` plugin (Effect guidance, skills and post-write pattern checks), pinned by `ref` to the `mpsuesser/enfect` commit that published 0.9.0; moving it is a reviewed edit of that SHA. Two more hooks run in a session: every Write/Edit/MultiEdit of a `.ts`/`.tsx`/`.js`/`.jsx`/`.mjs`/`.cjs`/`.css`/`.json`/`.md` file is followed by `vp fmt --write` on that file, and a Bash `git commit` / `git push` first runs `fallow audit` (`.claude/hooks/fallow-gate.sh`), which blocks on a `fail` verdict; it audits against `origin/trunk` (`FALLOW_AUDIT_BASE` overrides) and regenerates a stale coverage map first.

## Documentation surfaces

`README.md` at the root is the landing page; the package `README.md` is the API reference consumers read on npm; the package `CLAUDE.md` carries its terms, invariants and boundary; `CONTRIBUTING.md` carries setup, hooks and individual checks; `PUBLISHING.md` the release flow and its one-time setup; `SECURITY.md` vulnerability reporting and the supply-chain rationale. No `docs/` tree is committed (`packages/*/docs/` is docgen output); decisions go in issue comments.

---

<!-- fallow:setup-hooks:start -->

## Fallow local gate

Before any `git commit` or `git push`, run `fallow audit --format json --quiet --explain --gate-marker agent`. If the verdict is `fail`, fix the reported findings before retrying. Treat JSON runtime errors like `{ "error": true, ... }` as non-blocking.

Audit defaults to `gate=new-only`: only findings introduced by the current changeset affect the verdict. Inherited findings on touched files are reported under `attribution` and annotated with `introduced: false`, but do not block the commit. Set `[audit] gate = "all"` in `fallow.toml` to gate every finding in changed files.

For non-skill agents, treat the task map below as the local onboarding source: run the listed fallow command before destructive edits, before commits, and before pull request handoff.

## Fallow task map

| When the agent is about to... | Run |
| --- | --- |
| delete an "unused" export or file | `fallow dead-code --trace <file>:<export>` |
| prove a TypeScript symbol's exact consumers before refactoring | `fallow dead-code --type-aware --symbol-impact <file>:<export-or-class.method>` |
| find how one module reaches another | `fallow trace --path <from> <to>` (Reports `reachable: false` instead of failing when no import path exists; type-only hops are reported, not skipped.) |
| delete an "unused" dependency | `fallow dead-code --trace-dependency <name>` |
| commit or open a PR | `fallow audit --base <ref>` |
| read a diff before approving it | `fallow review --base <ref> --brief` (orientation, never gates: deterministic and always exit 0, unlike the audit row) |
| prioritize refactoring | `fallow health --hotspots --targets` |
| ask who owns code | `fallow health --ownership` |
| check untested-but-reachable code | `fallow health --coverage-gaps` |
| consolidate duplication | `fallow dupes --trace dup:<fingerprint>` |
| find feature flags | `fallow flags` |
| check which architecture rules apply to a file before changing it | `fallow guard <files>` |
| surface security candidates | `fallow security` |
| understand a finding | `fallow explain <issue-type>` |
| scope a monorepo | `--workspace <glob> / --changed-workspaces <ref>` (global flags, prefix any command) |

<!-- fallow:setup-hooks:end -->
