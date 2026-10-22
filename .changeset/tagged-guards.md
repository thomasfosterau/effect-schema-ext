---
"@thomasfosterau/effect-schema-ext": patch
---

`TriState.match` and the `Issues` leaf walk narrow on `_tag` with `Predicate.isTagged` instead of comparing `_tag` directly. No change to behaviour or to the emitted declarations.
