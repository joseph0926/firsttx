# npm package rollback

Published npm versions are immutable. Roll back a bad release by deprecating the affected version and publishing a corrected patch.

## Preconditions

- Use a maintainer workstation with npm two-factor authentication enabled.
- Confirm the exact package and version from the release pull request and npm provenance.
- Do not put an npm token in GitHub Actions or repository files.

## Procedure

1. Inspect the published version and its current deprecation status.

   ```bash
   npm view "@firsttx/PACKAGE@VERSION" version deprecated dist.integrity
   ```

2. Confirm that the replacement version is known, or state that a corrected patch will follow.

3. Deprecate only the affected version from an interactive 2FA-authenticated shell.

   ```bash
   npm deprecate "@firsttx/PACKAGE@VERSION" "REASON; use @firsttx/PACKAGE@REPLACEMENT"
   ```

4. Verify the registry result.

   ```bash
   npm view "@firsttx/PACKAGE@VERSION" version deprecated dist.integrity
   ```

5. Implement the correction, add a patch Changeset for every affected package, and send it through the normal pull request checks.

6. Merge the Changesets release pull request only after `Verify`, `Build`, `Security`, and `e2e-smoke` pass.

7. Verify the corrected package version and provenance on npm, then publish a GitHub release note describing the affected and replacement versions.

## Validation without mutation

Use `npm view` for rehearsal. Do not run `npm deprecate` during a drill because it changes public registry state.
