## Summary

Describe what changed and why. If this closes an issue, add `Closes #N` so it auto-closes on merge to `main`. For an extraction PR, list which SOURCE APP files (website / gardeneria / preferenceflow) the package supersedes — the apps' adoption issues delete them.

## Verification

Run the gates in [AGENTS.md § Verification](../AGENTS.md#verification), in order, and list each command with its final pass/fail. Say which gate could not run here, and why.

## Changeset

The changeset(s) under `.changeset/` this PR adds, with their bump, or why none is needed (docs-, CI- and tooling-only changes need none).

## Notes

Anything reviewers should pay special attention to: exported signatures, declaration-emit shape (brands, codec types), the `effect` peer floor, `sideEffects: false` (no effectful top-level statements in `dist/`), behaviour ported from an application that must stay compatible with what it serves today.
