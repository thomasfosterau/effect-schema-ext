---
"@thomasfosterau/effect-schema-ext": minor
---

**Breaking:** the `effect` peer floor is now `>=4.0.0-rc.118` (was `>=4.0.0-rc.112`). Effect moved its `effect/unstable/*` modules to `effect/*` in rc.118, so the package is built, type-checked, tested and documented against that line; consumers must be on `effect@4.0.0-rc.118` or later. No exported name or signature of this package changes.
