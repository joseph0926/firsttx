# CI/CD rollout checklist

Use this checklist after the infrastructure pull request has passed the new checks. Do not
enable the ruleset or the Vercel production deployment checks before the check names have
appeared on `main` at least once.

## 1. GitHub security settings

- Enable CodeQL default setup for JavaScript/TypeScript.
- Confirm that there are no open High or Medium code scanning alerts.
- Enable Dependabot alerts and Dependabot security updates.
- Enable grouped Dependabot security updates in repository settings.
- Keep Dependabot version updates disabled; this repository intentionally does not include
  `.github/dependabot.yml` because routine update pull requests are not part of its maintenance
  workflow.
- Review npm dependencies and pinned GitHub Action SHAs manually at least once per quarter.
- Change the Actions policy to require actions to be pinned to a full commit SHA.
- Allow only GitHub-owned actions plus the pnpm, Changesets, Vitest coverage, and OpenSSF
  Scorecard actions used by this repository.

## 2. Main ruleset

Create and enable a ruleset targeting the `main` branch with these requirements:

- Pull requests are required, with zero required approvals.
- Branches must be up to date before merging.
- Required status checks are `Verify`, `Build`, `Security`, and `e2e-smoke`.
- Conversations must be resolved before merging.
- Bypass is disabled, including for repository administrators.
- Force pushes and branch deletion are blocked.

Verify the ruleset with a failing required check and an administrator direct-push attempt.
Remove the old classic branch protection only after the ruleset has been verified.

## 3. Vercel deployment checks

Keep Git Integration and pull request previews enabled for both `firsttx-docs` and
`firsttx-playground`. Add GitHub Actions deployment checks to Production so that promotion
waits for `Verify`, `Build`, `Security`, and `e2e-smoke`.

Verify that a pull request preview is available while checks are running and that the
Production domain is promoted only after all four checks succeed.

## 4. Trusted publishing

- Confirm that the npm Trusted Publisher mapping points to `.github/workflows/release.yml`.
- Confirm that the `npm-publish` GitHub environment exists and has no npm token secret.
- Do not merge the existing Changesets release pull request until the new version job has
  updated it and all required checks pass.
- After merging it, verify npm package versions and provenance for every published package.

Use [npm rollback](./npm-rollback.md) for a bad release. Do not test rollback by deprecating a
real package during rollout.
