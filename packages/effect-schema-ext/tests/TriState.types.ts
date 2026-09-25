/**
 * @copyright Thomas Foster
 *
 * Type-level tests for `TriState`: the nullable-encoding readers reject an
 * `Option` (which they would misread as an assignment), and `toNullOrFields`
 * types each `Option` field as its nullable form while keeping key
 * optionality. Checked by the package's `check` task (tsconfig.test.json);
 * the expect-error directives are the assertions. Never executed.
 *
 * @module tests/TriState.types
 */

/* oxlint-disable effect/prefer-option-over-null -- the nullable encoding IS the shape under test */
import * as Option from "effect/Option";
import { TriState } from "@thomasfosterau/effect-schema-ext";

type Assert<T extends true> = T;
type Equals<A, B> =
  (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2 ? true : false;

declare const nullable: string | null | undefined;
declare const optionField: Option.Option<string> | undefined;

// The nullable readers take the nullable encoding…
export const read = TriState.readNullOr(nullable);
export const supplied = TriState.suppliedNullOr(nullable);
export const readNull = TriState.readNullOr(null);

// …and refuse an Option, which they would read as `Assign(Option.none())`.
// @ts-expect-error -- an Option-encoded field is read with TriState.read
export const readOption = TriState.readNullOr(Option.none<string>());
// @ts-expect-error -- an Option-encoded field is read with TriState.suppliedValue
export const suppliedOption = TriState.suppliedNullOr(Option.some("x"));
// @ts-expect-error -- an optional Option-encoded field too
export const readOptionalOption = TriState.readNullOr(optionField);

declare const input: {
  readonly id: string;
  readonly title?: Option.Option<string>;
  readonly summary?: Option.Option<string> | undefined;
  readonly count: Option.Option<number>;
  readonly name?: string | undefined;
};
export const converted = TriState.toNullOrFields(input);

export type Checks = [
  Assert<Equals<typeof read, TriState.TriState<string>>>,
  Assert<Equals<typeof supplied, Option.Option<string>>>,
  Assert<Equals<typeof readNull, TriState.TriState<never>>>,
  Assert<
    Equals<
      typeof converted,
      {
        readonly id: string;
        readonly title?: string | null;
        readonly summary?: string | null | undefined;
        readonly count: number | null;
        readonly name?: string | undefined;
      }
    >
  >,
];
