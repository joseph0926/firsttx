# CI/CD rollout checklist

> Status checked on 2026-07-29 against GitHub repository settings, recent `main` runs, and
> npm registry provenance. Vercel project settings and the npm Trusted Publisher mapping
> require direct checks in their respective consoles.

## 1. GitHub security settings

- [x] CodeQL default setup is configured for Actions and JavaScript/TypeScript.
- [x] Secret scanning and push protection are enabled.
- [ ] Resolve open code-scanning alerts. The current set includes 3 Critical, 3 High, 1 Medium,
      and 1 Low alert.
- [ ] Enable Dependabot alerts and Dependabot security updates; both are currently disabled.
- [ ] Enable grouped Dependabot security updates after Dependabot alerts are active.
- [x] Keep routine Dependabot version updates disabled. The solo maintainer does not review the
      weekly version pull requests, so their repeated creation and refresh is noise. The trade-off
      is that non-security version updates are not raised automatically.
- [ ] Review non-security dependency drift and pinned GitHub Action revisions before each package
      release.
- [ ] Require actions to be pinned to full commit SHAs and restrict the allowed action set.
      Repository policy currently allows all actions and does not require SHA pinning.

## 2. Main ruleset

- [x] The active `main protection` ruleset targets the default branch.
- [x] Pull requests are required with zero required approvals.
- [x] Branches must be up to date before merging.
- [x] Required checks are `Verify`, `Build`, `Security`, and `e2e-smoke`.
- [x] Conversations must be resolved before merging.
- [x] Bypass is disabled and force pushes and branch deletion are blocked.
- [x] The old classic branch protection is absent.

## 3. Vercel deployment checks

- [x] GitHub records Vercel Production deployments for `firsttx-docs` and
      `firsttx-playground`, and Preview environments exist for both projects.
- [ ] Confirm in Vercel that pull request previews remain available while checks run.
- [ ] Configure Production promotion to wait for `Verify`, `Build`, `Security`, and
      `e2e-smoke`. For `main` revision `720fb0188572d60820bd26d3a78dea96b2052a98`,
      Playground and Docs Production completed before the `e2e-playwright` and `Pull Request`
      workflows, so the gate is not currently effective.

## 4. Trusted publishing

- [ ] Confirm in npm that the Trusted Publisher mapping points to
      `.github/workflows/release.yml`; GitHub cannot expose the npm-side mapping.
- [x] The `npm-publish` GitHub environment exists and has no environment secrets.
- [x] The release workflow publishes from the revision that passed the required checks and does
      not provide an npm token.
- [x] The latest `prepaint`, `local-first`, `tx`, `devtools`, and `shared` packages have npm
      SLSA provenance.
- [ ] For each future Changesets release pull request, wait for the version update and all
      required checks before merging.

Use [npm rollback](./npm-rollback.md) for a bad release. Do not test rollback by deprecating a
real package during rollout.
