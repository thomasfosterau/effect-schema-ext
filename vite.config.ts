/**
 * Root workspace config: the repo-wide fmt / lint / staged passes and the root
 * `check`, `docgen` and `test:coverage` aggregates. Per-package tasks come
 * from `vite.package.ts`.
 *
 * @copyright Thomas Foster
 */

import { defineConfig } from "vite-plus";
import { recommended } from "@effect/tsgo/oxlint-presets";
import effect from "@enfect/oxlint";

export default defineConfig({
  // Staged-file checks run by `vp staged` (pre-commit).
  staged: {
    "*.{js,ts,css,json,md}": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["**/dist/**", "**/docs/**", "**/coverage/**"],
    overrides: [
      {
        files: ["**/*.md"],
        options: {
          proseWrap: "never",
        },
      },
    ],
  },
  lint: {
    ignorePatterns: ["**/dist/**", "**/docs/**", "**/coverage/**", "**/node_modules/**"],
    extends: [recommended, effect.configs.recommended],
    plugins: ["eslint", "typescript", "unicorn", "oxc", "import", "promise", "vitest", "jsdoc"],
    categories: {
      correctness: "error",
      suspicious: "error",
      perf: "error",
    },
    rules: {
      "eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "eslint/prefer-const": "warn",
      // The `Buffer` global is typed `any` wherever a consumer loads
      // @cloudflare/workers-types next to @types/node (every application this
      // library serves), so every call on it is unchecked there. Use
      // Uint8Array / TextEncoder / DataView instead.
      "eslint/no-restricted-globals": [
        "error",
        {
          name: "Buffer",
          message:
            "The `Buffer` global is typed `any` wherever @cloudflare/workers-types is loaded. Use Uint8Array / TextEncoder / DataView.",
        },
      ],
      // `casting-awareness` is an awareness prompt, not a defect rule — it
      // fires on every `as`, including the narrowings a schema-AST reader
      // structurally requires. Stays visible as a warning.
      "effect/casting-awareness": "warn",
      // Hard-codes abbreviations (`Arr`, `P`, `R`, …) with no options, so it is
      // unsatisfiable under the full-name convention (`import * as Option from
      // "effect/Option"`) this library shares with its consumers.
      "effect/prefer-namespace-imports": "off",

      // ---- Effect preset: rules this workspace's conventions cut across ----
      // `prefer-option-over-null` also fires on `?: T | undefined`, which is
      // the ONLY spelling of an optional member `exactOptionalPropertyTypes`
      // lets a caller forward an optional of its own into (AGENTS.md). A bare
      // `null` / `undefined` in a return type is still a finding to read; the
      // options-object members are not. The remaining sites are exactly those
      // members (`SlugOptions`, `PointerOptions`, `PaginationOptions`,
      // `IdListOptions`) and the dist-consumer assertions of the tri-state's
      // nullable encoding, which is the published contract.
      "effect/prefer-option-over-null": "warn",
      // `unknown` is the honest type of a decode probe's input: the `Ast`
      // module asks "does this schema accept `null` / `[]` / an ISO
      // string?", and the answer is a decode of an arbitrary value. The
      // tests' `issueFor` / `accepts` helpers are the same probe.
      "effect/no-unknown-parameters": "warn",
      // docgen's own tags: every export carries `@since` and `@category`
      // (AGENTS.md), and module headers `@module` / `@copyright`.
      "jsdoc/check-tag-names": [
        "error",
        { definedTags: ["since", "category", "module", "copyright"] },
      ],
      // `_tag` is Effect's discriminant, read on every tagged value.
      "eslint/no-underscore-dangle": ["error", { allow: ["_tag"] }],
      // Every remaining assertion is already gated twice, by
      // `effect/casting-awareness` (a warning on each `as`) and by
      // `effect/require-safety-comment-for-type-assertion` (a `SAFETY:`
      // invariant above it). The three left in `src/` re-type an overloaded
      // implementation or a mapped record no generic can prove, which a type
      // guard cannot narrow either.
      "typescript/no-unsafe-type-assertion": "off",
      // Type-aware since vite-plus 1.4: six sites in `Bounded.ts` build the
      // page window on `Schema.Number` + `isInt()`, which already rejects
      // NaN / ±Infinity. Moving them to `Schema.Finite` changes the public
      // types, so it is its own change; stays visible as a warning until then.
      "effecttsgo/schema-number": "warn",
      "typescript/no-explicit-any": "off",
      "typescript/no-empty-object-type": "off",
      "typescript/ban-ts-comment": "off",
      "unicorn/no-empty-file": "off",
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    overrides: [
      // Build/test configs are evaluated by Vite and Vitest in bare Node,
      // before any Effect runtime exists — there is no `Config` provider to
      // read from and no `FileSystem` service to call, so `process.env` and
      // `node:*` are the only things that work there. The Effect preset's
      // service rules have no satisfiable fix in these files.
      {
        files: ["**/vite.config.ts", "**/vitest.config.ts", "vite.package.ts", "scripts/**"],
        rules: {
          "effect/avoid-node-imports": "off",
          "effect/avoid-sync-fs": "off",
          "effect/avoid-process-env": "off",
          // Plain Node build tooling (the per-package task graph and alias
          // builder): native `.length` checks and `Object.fromEntries` are the
          // idiom, and importing `effect` into a config Vite loads before any
          // workspace package is built buys nothing.
          "effect/imperative-loops": "off",
          "effect/no-length-comparison": "off",
          "effect/prefer-arr-match": "off",
          "effect/avoid-native-object-helpers": "off",
          "effect/use-console-service": "off",
          "effect/use-filesystem-service": "off",
          "effect/use-path-service": "off",
          "effect/avoid-native-fetch": "off",
          "effect/effect-promise-vs-trypromise": "off",
          // `...(process.env.X ? { x } : {})` is how a vitest option is left
          // unset under `exactOptionalPropertyTypes`.
          "effect/no-conditional-empty-object-spread": "off",
        },
      },
      // Type-level tests: the expect-error directives ARE the assertions
      // (a statement that must fail to compile), and every binding exists to
      // be asserted against, never to be read.
      {
        files: ["**/tests/**/*.types.ts", "tests/dist-consumer/src/*.ts"],
        rules: {
          "eslint/no-unused-vars": "off",
          "effect/avoid-ts-ignore": "off",
          // `Equals<A, B>` compares `<X>() => X extends A ? 1 : 2` with its
          // twin: each `X` is used once by design, it is the standard exact
          // type-equality idiom.
          "typescript/no-unnecessary-type-parameters": "off",
          // `typeof X.Type` is the subject under test here: the assertion is
          // that the schema's decoded type survives (declaration emit), so
          // swapping in the exported alias would test the alias instead.
          "effecttsgo/unnecessary-typeof-type": "off",
        },
      },
      // The dist-consumer fixture resolves the package to its EMITTED
      // `dist/` declarations, which `vp check` does not build first: before a
      // build every imported type is `any`, so this union rule misreads the
      // assertions. `vp run check` (which builds) is that fixture's gate.
      {
        files: ["tests/dist-consumer/**"],
        rules: {
          "typescript/no-redundant-type-constituents": "off",
        },
      },
      // Test fixtures are the seams under test, not domain code. Each rule
      // below stays visible as a warning; none can be written another way in
      // a fixture.
      {
        files: ["**/tests/**/*.ts"],
        rules: {
          "effect/require-safety-comment-for-type-assertion": "warn",
          "effect/use-clock-service": "warn",
          "effect/avoid-process-env": "warn",
          "effect/require-effect-concurrency": "warn",
        },
      },
    ],
    // Type-aware rules on (oxlint-tsgolint, Effect-patched by `prepare`);
    // `typeCheck` stays off: type checking is the `check` tasks' job (native
    // tsc, Effect-patched, with the tests' own tsconfig).
    options: {
      typeAware: true,
      typeCheck: false,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
  run: {
    tasks: {
      // The CI typecheck gate, as one task: the package's `check` (`src`
      // under tsconfig.json, the type-level tests under tsconfig.test.json),
      // plus the dist-consumer check that type-checks a consumer fixture
      // against the EMITTED declarations (a brand that degrades to `string`,
      // or a codec that emits as `any`, only shows up there). A pure graph
      // node; a new package adds itself here and to `docgen` below.
      check: {
        command: "echo 'check: every type gate green'",
        dependsOn: [
          "@thomasfosterau/effect-schema-ext#check",
          "@effect-schema-ext/dist-consumer#check",
        ],
        cache: false,
      },
      // Every package's docgen: compiles AND RUNS each JSDoc `@example`
      // against the built `dist/`, then writes the API reference under that
      // package's (git-ignored) `docs/`. Same pure-graph-node shape.
      docgen: {
        command: "echo 'docgen: every example compiled and ran'",
        dependsOn: ["@thomasfosterau/effect-schema-ext#docgen"],
        cache: false,
      },
      // Every package's unit suite under one Istanbul coverage map
      // (`coverage/coverage-final.json`), which `fallow audit` reads for exact
      // per-function CRAP scores (`health.coverage` in .fallowrc.json).
      // Without it fallow estimates every function as uncovered, and any
      // function with cyclomatic complexity ≥ 5 fails the gate on its own.
      // Run this before `fallow audit` (the Claude Code PreToolUse hook
      // `.claude/hooks/fallow-gate.sh` runs the audit on `git commit` /
      // `git push`).
      "test:coverage": {
        command: "vp test run --coverage",
        cache: false,
      },
    },
  },
  test: {
    // One entry per package: each package's own vite.config.ts is a vitest
    // project, so the root run and the root coverage map cover them all.
    projects: ["packages/*/vite.config.ts"],
    coverage: {
      provider: "istanbul",
      reporter: ["text-summary", "json-summary", "json"],
      reportsDirectory: "./coverage",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.d.ts"],
    },
  },
});
