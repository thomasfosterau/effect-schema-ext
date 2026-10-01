# packages/effect-schema-ext — `@thomasfosterau/effect-schema-ext`

The pure Effect Schema helpers the three applications duplicate. Peer: `effect` only. One entry point per module (`./TriState`, `./Issues`, `./Bounded`, `./Ids`, `./LiteralExact`, `./Ast`) plus the `.` barrel that re-exports each as a namespace.

## Terms

- **Tri-state** — the three things a partial-update field can say: absent (carry the stored value forward), `null` (clear), a value (set). Two encodings: the **`Option` encoding** (`TriState.clearable`, `optionalKey(OptionFromNullOr(X))`: absent / `none` / `some`) that website and gardeneria use, and the **nullable encoding** (`TriState.clearableNullOr`, `optional(NullOr(X))`: absent / `null` / value) that preferenceflow and a SQL `SET` map use.
- **Reader** — a function over one tri-state field. A **separating** reader (`read`, `readNullOr`, `toNullOr`, and `toNullOrFields` over a whole input) keeps the three states apart and is for write paths; a **folding** reader (`suppliedValue`, `suppliedNullOr`) merges "absent" and "clear" into `Option.none()` and is for side effects only. The nullable-encoding readers refuse an `Option` at compile time.
- **Leaf** — a terminal `SchemaIssue` with the path that reaches it; **pointed issue** — a leaf rendered as an RFC 6901 pointer (under a caller-chosen prefix), its tag and its formatted message.
- **Probe** — a decode of a fixed input (`null`, `[]`, an ISO timestamp) through a schema's JSON codec, used to read a field's traits without unpicking its AST.

## Local invariants

- **No JSON:API, Drizzle or application vocabulary.** The `data/attributes` pointer prefix, a JSON:API error object, a `dbColumn` annotation, a reserved-route list or a page cap are the caller's; they are parameters here, never defaults.
- **A separating reader never folds.** `read(undefined)` is `CarryForward`, never `Clear`; `toNullOr(undefined)` is `undefined`, never `null`. The tests pin both directions.
- **The wire is unchanged by the field schemas.** Encoding a decoded tri-state payload reproduces the JSON it came from: an absent key stays absent, `null` stays `null`.
- **FlatQuery parity.** `PageOffset`, `pageLimit`, `pagination` (+ `PaginationOptions`, `DefaultedPagination`, `RequiredPagination`), `idList` / `IdList` / `DEFAULT_MAX_ID_LIST`, `Uuid`, `SLUG_PATTERN`, `slug` / `Slug` and `suppliedValue` keep effect-jsonapi `FlatQuery`'s names, signatures, defaults and messages: its `src/internal/schemaExt.ts` moves here "as an import change, not an API change". Additions are fine (`idList`'s `dedupe` option, off by default); a changed default or message is a break for that move. The `FlatQuery parity` test blocks pin it.
- **Bounds apply to input as sent.** `IdList` counts ids before de-duplication, so repeats cannot pad a request past the bound; the decoded side keeps the bound too.
- **Probes decode through `Schema.toCodecJson`**, the wire reading (`Schema.Date`'s own decoder accepts only a `Date` instance on effect rc.115 and later).
- **Every export has `@since`, `@category` and a runnable `@example`** whose `// →` comments match what it prints.

## Boundary

Imports nothing from this workspace (`.fallowrc.json` zone `schema-ext`, no outbound rule). Modules may import each other (`Bounded` → `Ids`); `index.ts` only re-exports.
