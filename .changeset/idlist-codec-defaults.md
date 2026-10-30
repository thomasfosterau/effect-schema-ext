---
"@thomasfosterau/effect-schema-ext": patch
---

`Bounded.IdListCodec` is now declared as `Schema.Codec<ReadonlyArray<string>, string | ReadonlyArray<string>>`, dropping the two `never` type arguments that were already the defaults (a lint finding). The type is unchanged; only its emitted declaration text is shorter.
