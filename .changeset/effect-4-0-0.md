---
"@thomasfosterau/effect-schema-ext": minor
---

Tested against effect 4.0.0; peer floor unchanged (`>=4.0.0-rc.118`). `Ids.make` and `Ids.refine` now type their brand identifier as `Schema.brand`'s own parameter, so they reject non-literal or union brand identifiers, matching effect 4.0.0's `Schema.brand`. Calls with a string literal (`Ids.make("PersonId")`) are unaffected; a `string` or union argument no longer compiles.
