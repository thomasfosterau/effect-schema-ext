---
"@thomasfosterau/effect-schema-ext": patch
---

Tested against effect 4.0.0; peer floor unchanged (`>=4.0.0-rc.118`). `Ids.make` and `Ids.refine` pass their generic brand identifier through a typed assertion so they compile against 4.0.0's stricter `Schema.brand`; their public types and the emitted declarations are unchanged.
