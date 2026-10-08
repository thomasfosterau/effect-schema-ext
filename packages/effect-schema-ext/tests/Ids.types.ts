/**
 * @copyright Thomas Foster
 *
 * Type-level tests for the branded ids: a raw string is never an id, two
 * sibling brands never mix, a child brand widens to its parent but not the
 * other way round, and the wire side stays `string`. Checked by the package's
 * `check` task (tsconfig.test.json); the expect-error directives are the
 * assertions. Never executed.
 *
 * @module tests/Ids.types
 */

import type * as Schema from "effect/Schema";
import { Ids } from "@thomasfosterau/effect-schema-ext";

type Assert<T extends true> = T;
type Equals<A, B> =
  (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2 ? true : false;

const EntityId = Ids.make("EntityId");
const PersonId = Ids.refine(EntityId, "PersonId");
const PlaceId = Ids.refine(EntityId, "PlaceId");
type EntityId = typeof EntityId.Type;
type PersonId = typeof PersonId.Type;
type PlaceId = typeof PlaceId.Type;

declare const raw: string;
declare const person: PersonId;
declare const entity: EntityId;

// @ts-expect-error -- a raw string has not been decoded
export const rawAsId: PersonId = raw;

// @ts-expect-error -- sibling brands never mix
export const personAsPlace: PlaceId = person;

// A child brand is its parent…
export const personAsEntity: EntityId = person;
// @ts-expect-error -- …but a parent is not the child
export const entityAsPerson: PersonId = entity;

// An id is still a string wherever a string is wanted.
export const idAsString: string = person;

// Literal identifiers infer `B` exactly…
export const literalId = Ids.make("LiteralId");
export const literalChild = Ids.refine(EntityId, "LiteralChild");

declare const union: "A" | "B";
declare const wide: string;

// …but, as with effect 4.0.0's `Schema.brand`, a union or a plain string is
// not a single concrete brand key.
// @ts-expect-error -- a union identifier is not one brand key
export const unionMake = Ids.make(union);
// @ts-expect-error -- a plain string identifier is not one brand key
export const wideMake = Ids.make(wide);
// @ts-expect-error -- a union identifier is not one brand key
export const unionRefine = Ids.refine(EntityId, union);
// @ts-expect-error -- a plain string identifier is not one brand key
export const wideRefine = Ids.refine(EntityId, wide);

export type Checks = [
  Assert<Equals<typeof literalId, Schema.brand<Schema.String, "LiteralId">>>,
  Assert<Equals<typeof PersonId.Encoded, string>>,
  Assert<Equals<typeof Ids.Uuid.Type, string>>,
  Assert<Equals<typeof Ids.Slug.Type, string>>,
];
