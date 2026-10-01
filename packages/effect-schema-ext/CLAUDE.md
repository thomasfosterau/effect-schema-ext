# @thomasfosterau/effect-schema-ext

The published package: one subpath per module plus the `.` barrel. Peer: `effect` only — two copies break `Schema` identity, so the consuming app owns the singleton.

## Boundary

Imports nothing from this workspace (`.fallowrc.json` zone `schema-ext`, no outbound rule). Modules may import each other (`Bounded` → `Ids`); `index.ts` only re-exports.

## Invariants

- **No JSON:API, Drizzle or application vocabulary.** The `data/attributes` pointer prefix, a JSON:API error object, a `dbColumn` annotation, a reserved-route list or a page cap are the caller's; they are parameters here, never defaults. An app-shaped special case is a constructor parameter with the app's value in the README.
- **A separating reader never folds.** `read(undefined)` is `CarryForward`, never `Clear`; `toNullOr(undefined)` is `undefined`, never `null`. The tests pin both directions. A new reader states whether it separates or folds.
- **The wire is unchanged by the field schemas.** Encoding a decoded tri-state payload reproduces the JSON it came from: an absent key stays absent, `null` stays `null`.
- **FlatQuery parity.** `PageOffset`, `pageLimit`, `pagination` (+ `PaginationOptions`, `DefaultedPagination`, `RequiredPagination`), `idList` / `IdList` / `DEFAULT_MAX_ID_LIST`, `Uuid`, `SLUG_PATTERN`, `slug` / `Slug`, `suppliedValue` and `Issues.pathToJsonPointer` keep effect-jsonapi's names, signatures, defaults and messages (`FlatQuery.*`, plus `ServerErrors.pathToJsonPointer`, both backed today by its `src/FlatQuery.ts` and `src/internal/schemaExt.ts`): its switch to this package (#12) is an import change, not an API change. Additions are fine (`idList`'s `dedupe` option, off by default); a changed default or message is a break for that move. The `FlatQuery parity` test blocks pin it.
- **Bounds apply to input as sent.** `IdList` counts ids before de-duplication, so repeats cannot pad a request past the bound; the decoded side keeps the bound too.
- **Probes decode through `Schema.toCodecJson`**, the wire reading (`Schema.Date`'s own decoder accepts only a `Date` instance on effect rc.115 and later).
- **Every export has a one-line summary, `@since` and `@category`; every exported function and schema also has a runnable `@example`** (docgen executes it). Types and plain constants need no example.

## Terms

- **Tri-state** — the three things a partial-update field can say: absent (carry the stored value forward), `null` (clear), a value (set). Two encodings: the **`Option` encoding** (`TriState.clearable`, `optionalKey(OptionFromNullOr(X))`: absent / `none` / `some`) that website and gardeneria use, and the **nullable encoding** (`TriState.clearableNullOr`, `optional(NullOr(X))`: absent / `null` / value) that preferenceflow and a SQL `SET` map use.
- **Reader** — a function over one tri-state field. A **separating** reader (`read`, `readNullOr`, `toNullOr`, and `toNullOrFields` over a whole input) keeps the three states apart and is for write paths; a **folding** reader (`suppliedValue`, `suppliedNullOr`) merges "absent" and "clear" into `Option.none()` and is for side effects only. The nullable-encoding readers refuse an `Option` at compile time.
- **Leaf** — a terminal `SchemaIssue` with the path that reaches it; **pointed issue** — a leaf rendered as an RFC 6901 pointer (under a caller-chosen prefix), its tag and its formatted message.
- **Probe** — a decode of a fixed input (`null`, `[]`, an ISO timestamp) through a schema's JSON codec, used to read a field's traits without unpicking its AST.
