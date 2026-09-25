/**
 * @copyright Thomas Foster
 *
 * Type-level tests for `Bounded.pagination`: `maxLimit` is required (there is
 * no default page cap), and the `defaultLimit: false` overload returns the
 * required-keys fields. Checked by the package's `check` task
 * (tsconfig.test.json); the expect-error directives are the assertions.
 * Never executed.
 *
 * @module tests/Bounded.types
 */

import * as Schema from "effect/Schema";
import { Bounded } from "@thomasfosterau/effect-schema-ext";

type Assert<T extends true> = T;
type Equals<A, B> =
  (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2 ? true : false;

// @ts-expect-error -- the page cap is the caller's: no argument, no cap
export const noOptions = Bounded.pagination();
// @ts-expect-error -- `maxLimit` is required
export const noCap = Bounded.pagination({ defaultLimit: 20 });

export const defaulted = Bounded.pagination({ maxLimit: 100 });
export const required = Bounded.pagination({ maxLimit: 100, defaultLimit: false });

const DefaultedInput = Schema.Struct(defaulted);
const RequiredInput = Schema.Struct(required);

export type Checks = [
  Assert<Equals<typeof defaulted, Bounded.DefaultedPagination>>,
  Assert<Equals<typeof required, Bounded.RequiredPagination>>,
  // Defaulted: optional on the wire, concrete once decoded.
  Assert<Equals<typeof DefaultedInput.Type, { readonly offset: number; readonly limit: number }>>,
  Assert<
    Equals<typeof DefaultedInput.Encoded, { readonly offset?: number; readonly limit?: number }>
  >,
  // Required: both keys on both sides.
  Assert<Equals<typeof RequiredInput.Encoded, { readonly offset: number; readonly limit: number }>>,
];
