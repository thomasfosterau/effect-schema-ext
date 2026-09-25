/**
 * @copyright Thomas Foster
 *
 * `@thomasfosterau/effect-schema-ext` — the pure Effect Schema helpers the
 * website, gardeneria and preferenceflow applications duplicate. Each module
 * is also its own entry point (`@thomasfosterau/effect-schema-ext/TriState`,
 * …); this barrel re-exports them as namespaces.
 *
 * @since 0.1.0
 */

/**
 * Schema introspection by AST and behavioural decode probe.
 *
 * @since 0.1.0
 */
export * as Ast from "./Ast.ts";

/**
 * Bounded pagination and id-list schemas for list inputs.
 *
 * @since 0.1.0
 */
export * as Bounded from "./Bounded.ts";

/**
 * UUID, branded-UUID ids and slugs.
 *
 * @since 0.1.0
 */
export * as Ids from "./Ids.ts";

/**
 * Schema issue trees → RFC 6901 JSON Pointers.
 *
 * @since 0.1.0
 */
export * as Issues from "./Issues.ts";

/**
 * Literal tuples checked to cover a union exactly.
 *
 * @since 0.1.0
 */
export * as LiteralExact from "./LiteralExact.ts";

/**
 * The update tri-state: field schemas and readers.
 *
 * @since 0.1.0
 */
export * as TriState from "./TriState.ts";
