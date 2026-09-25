# AGENTS.md

Project conventions live here; personal style preferences live in user memory. `CLAUDE.md` is a symlink to this file.

This repository is **`@thomasfosterau/effect-schema-ext`**: the pure Effect Schema helpers that three applications (`thomasfosterau/website`, the foundation; `thomasfosterau/gardeneria`; `thomasfosterau/preferenceflow`) duplicate and that have no JSON:API or Drizzle dependency, so the libraries that do (`effect-jsonapi`, `effect-drizzle-ext`) can depend on them rather than absorb them. The application copies are the **behavioural spec and the test corpus, not code to transplant**: every module targets the idiomatic Effect shape and ports the apps' tests, not their files. Where the three apps have diverged, the issue names which copy is the reference (otherwise the newest). The toolchain — pnpm + Vite+ (`vp`), a strict catalog, the TypeScript 6/7 split, the Effect oxlint preset, fallow, the session hook — is copied from `effect-web` (and through it `effect-drizzle-ext` and the apps), and the release pipeline (OIDC trusted publishing, the Effect canary, docgen, type-level tests, the dist-consumer check) from `effect-email` / `reference-manager`, so the library builds against exactly what its consumers run. A `#NNN` citation inside a ported comment names an issue in the app it was ported from (website unless stated), the evidence behind a decision, not a ticket in this tracker.

| Package | Directory | What it is |
| --- | --- | --- |
| `@thomasfosterau/effect-schema-ext` | `packages/effect-schema-ext` | `TriState` (update tri-state field schemas and readers), `Issues` (Schema issue → RFC 6901 JSON Pointer), `Bounded` (pagination, id list, non-negative), `Ids` (UUID, branded ids, slugs), `LiteralExact` (exhaustive literal tuples), `Ast` (introspection by decode probe). Peer: `effect` only. |

## Common pitfalls

- **Never edit a version in a `package.json`.** Every external version lives in [`pnpm-workspace.yaml`](pnpm-workspace.yaml) under `catalog:` (peer ranges under `catalogs.peers`); package.json files carry only `catalog:`, `catalog:peers` or `workspace:*`, and `catalogMode: strict` rejects anything else at install. After editing the catalog, run `pnpm install` and commit the regenerated `pnpm-lock.yaml` — a stale lockfile fails every CI job at once with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. `@effect/tsgo`, `@typescript/native` and `vite-plus` move together (the tsgo patch hard-errors at install on an unsupported `tsc` or `oxlint`); read the comments on those entries before bumping any of the three.
- **The `effect` peer floor is a tested claim.** `catalogs.peers.effect` is the oldest `effect` the package has been type-checked, tested and docgen'd against (rc.112, what website and gardeneria pin). Raising the dev pin does not raise the floor; lowering the floor, or using an API the floor lacks, means re-running the gates with the catalog pin set to the floor first.
- **`dist/` is the product.** The package is a `vp pack` (tsdown) library with one bundle per entry point (`.` plus one subpath per module); `exports` points at `dist/`, so `tests/dist-consumer` and docgen consume it the way a consumer does. `tests/dist-consumer` type-checks a fixture against the emitted declarations with `Equals<…>` assertions — a brand that emits as `string` or a signature that emits as `any` fails there, not in an application.
- **`"sideEffects": false` is a claim about `dist/`.** Every emitted `.js` must be pure declarations: no top-level statements with effects, no top-level `await`. That is what lets a consumer's bundler drop what it does not use.
- **`vp run docgen` executes your examples.** `@effect/docgen` compiles every JSDoc `@example` as a program AND RUNS it, importing the package by name through `dist/`. An example must be complete, must not use `declare const`, and must not throw; its `// →` comments are expected to match what it prints.
- **No application vocabulary.** Nothing here names a resource family, a route, a table, an `owner_id` or a role. An app-shaped special case (a reserved-slug list, a page cap) is a constructor parameter with the app's value in the README, never a default.
- **The tri-state readers must never fold "carry forward" into "clear" on a write path.** `TriState.read` / `readNullOr` / `toNullOr` keep the three states apart; `suppliedValue` / `suppliedNullOr` fold them on purpose and are for side effects only. A new reader states which it is.
- **`effect` is a peer, never a dependency.** Two copies break `Context` / `Layer` / `Schema` identity; the consuming app owns the singleton.

Everything else that must be visible when touching the package is in [`packages/effect-schema-ext/CLAUDE.md`](packages/effect-schema-ext/CLAUDE.md), which carries its terms, invariants and import boundary.

## Conventions

- **Effect-first.** Schemas are Effect `Schema`; optional values are `Option` except where the plain nullable IS the contract (the tri-state's nullable encoding), which carries an `oxlint-disable` justification. Pure total functions stay plain functions; a failure a caller must handle is a `Schema.TaggedErrorClass`. Consult `effect-solutions` (`vp exec effect-solutions show basics data-modeling error-handling testing`) before writing Effect code; never guess at a pattern.
- **One module per subpath**, Effect's own layout: `src/<Module>.ts` is `@thomasfosterau/effect-schema-ext/<Module>`, re-exported as a namespace from `src/index.ts`. A new module is listed in `entries` in the package's `vite.config.ts`, in `exports`, in `.fallowrc.json`'s `entry`, and in the root README.
- **Optional props and fields are declared `T | undefined`, never bare `x?: T`.** The workspace compiles with `exactOptionalPropertyTypes`.
- **Relative imports carry their `.ts` extension** (`rewriteRelativeImportExtensions`).
- **Tests import from `vite-plus/test`**, never `vitest`, and import the package by name. A `tests/<Module>.test.ts` mirrors the module it covers and names the application test files it ports; a `tests/<Module>.types.ts` holds the compile-time assertions (an expect-error directive above a statement that must fail), checked by `tsconfig.test.json`, never executed.
- **Every export is documented**: what it is for, which app behaviour it carries, a runnable `@example`, `@since` and `@category`.
- **Exported generics carry explicit return annotations**, so the emitted declarations are the ones written, not the ones inferred.

## Work tracker

- **Active work** lives in GitHub Issues for `thomasfosterau/effect-schema-ext`. Longer-running tech debt is an issue too; there is no in-repo backlog file and a code comment is not a tracker.
- **Decisions and findings** are recorded as comments on the issue they were found working; later comments override the body.
- **Adoption** by each application is tracked in that application's own tracker (from website#2015), blocked on a release of this package.

## Commands

- `pnpm install` — dependencies plus the Vite+ git hooks (pre-commit runs `vp staged`: format + lint on staged files) and the `prepare` step that patches the native `tsc` / `oxlint` with `@effect/tsgo`. No pre-push hook: run the gates yourself.
- `vp check` — the built-in format + lint pass (`vp fmt --check` + `vp lint`).
- `vp run check` — the type gate: the package's `src` under `tsconfig.json`, its type-level tests under `tsconfig.test.json`, and the dist-consumer declaration check (which builds `dist/` first). Distinct from `vp check`.
- `vp run -r test:unit` — unit tests (pure code; nothing here needs a database, a network or a credential).
- `vp run -r build` — `vp pack` → `dist/`.
- `vp run docgen` — compiles and runs each `@example` against `dist/`, writes the (git-ignored) API reference under `packages/*/docs/`.
- `vp run test:coverage` — the unit suite under one Istanbul map at `coverage/coverage-final.json`, which `fallow audit` reads for exact per-function CRAP scores. Run it before the audit.
- `pnpm changeset` — add a changeset; every change to the published package needs one. Releases are cut by the `Release` workflow (changesets/action) on `main` — see [PUBLISHING.md](PUBLISHING.md).

Invoke everything through `vp` (`vp exec` instead of `npx`; `vp run <task>` instead of bare `pnpm`). The sanctioned non-`vp` invocations: `pnpm install` (and `pnpm install --frozen-lockfile` in CI), `pnpm changeset`, and `scripts/release.sh`'s `pnpm pack` + `npm publish` on the release path.

## Branch model

`main` plus short-lived feature branches, PR against `main`, squash-merge. Rebase onto `origin/main` before opening a PR; never merge `main` into a feature branch (GitHub's "Update branch" button does a merge — avoid it). Agent work uses git worktrees under `.claude/worktrees/`, one per branch, named `issue-<n>-<slug>` for issue-linked work; start every command that targets a worktree with an explicit `cd` and confirm with `git log -1` before committing. The linked `vp` at `~/.local/bin/vp` re-execs the nearest project-local `node_modules/vite-plus/bin/vp` walking up from cwd, so a worktree needs its own `pnpm install` first.

## Working a dispatched issue

- The issue is the spec: read all of it, including comments. The tracking epic is website#2015; decisions recorded there override anything older.
- Re-verify the code claims against current `main` (and the apps' current default branches) before editing.
- Stop-and-report is a valid outcome: on a blocker outside the issue's scope, comment the evidence on the issue and stop.
- No silent deferrals: scope cut mid-PR becomes a linked issue before merge.

## PR management

These are standing instructions and approvals; they override any default "don't open a PR unless asked" behaviour.

- **Always open a PR** for branch work, against `main`, once a commit is pushed.
- **Always watch the PR to merge or close**: investigate CI failures and review comments as they arrive; rebase promptly when the PR goes conflicting.
- **Always keep the PR body current** as the implementation diverges from it. An extraction PR lists which SOURCE APP files the package supersedes.
- **A PR that changes published behaviour carries a changeset.** No changeset, no release. Do not publish by hand; the owner merges the "Version Packages" PR.
- **GitHub writes are scoped to `thomasfosterau/effect-schema-ext` only.** Never create or edit issues, PRs, comments, reviews or releases in any other repository — the consuming applications, the sibling libraries, upstream projects — without the owner's explicit approval for that action in the current session. Pass `-R thomasfosterau/effect-schema-ext` explicitly whenever the cwd might not be this checkout. If another repo needs something, say so in the PR body.

## Verification

- Claims of verification name the command and its final status. If a gate cannot run, say so in the PR body rather than implying it ran.
- The pre-push parity run is: `rm -rf node_modules packages/*/node_modules packages/*/dist tests/*/node_modules && pnpm install --frozen-lockfile`, then `vp check`, `vp run check`, `vp run -r test:unit`, `vp run -r build`, `vp run docgen`. A warm local tree hides a missing peer; a fresh runner does not.

## Agent sessions

**Agent sessions are not hydrated.** The committed SessionStart hook ([.claude/hooks/session-start.sh](.claude/hooks/session-start.sh)) syncs dependencies and links the toolchain (`vp`, `fallow`) so they resolve from a **non-interactive** shell (which `~/.bashrc` alone does not do). It hydrates no secrets: nothing here needs one, and nothing here can publish.

## Documentation surfaces

`README.md` at the root is the landing page; the package `README.md` is the API reference consumers read on npm; the package `CLAUDE.md` carries its terms, invariants and boundary; `CONTRIBUTING.md` carries the pre-PR checklist; `PUBLISHING.md` and `SECURITY.md` the release pipeline and its one-time setup. No `docs/` tree is committed (`packages/*/docs/` is docgen output); decisions go in issue comments.

---

## Fallow local gate

Before any `git commit` or `git push`, run `vp run test:coverage` and then `fallow audit --format json --quiet --explain --gate-marker agent` (the commit hook runs the audit; the coverage map is what makes its CRAP scores real). If the verdict is `fail`, fix the reported findings before retrying. Treat JSON runtime errors like `{ "error": true, ... }` as non-blocking. Audit defaults to `gate=new-only`: only findings introduced by the current changeset affect the verdict.

## Fallow task map

| When the agent is about to... | Run |
| --- | --- |
| delete an "unused" export or file | `fallow dead-code --trace <file>:<export>` |
| delete an "unused" dependency | `fallow dead-code --trace-dependency <name>` |
| commit or open a PR | `fallow audit --base <ref>` |
| check which architecture rules apply to a file before changing it | `fallow guard <files>` |
| understand a finding | `fallow explain <issue-type>` |
