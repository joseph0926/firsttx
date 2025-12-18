# Governance

This document describes the governance model for FirstTx.

## Roles

### Maintainers

Maintainers have full access to the repository including:

- Merging pull requests
- Creating releases
- Managing CI/CD and repository settings
- Final decision authority on technical direction

Current maintainers:

| Name       | GitHub                                       | Email                    |
| ---------- | -------------------------------------------- | ------------------------ |
| joseph0926 | [@joseph0926](https://github.com/joseph0926) | joseph0926.dev@gmail.com |

### Reviewers

Reviewers can approve pull requests but cannot merge without maintainer approval. Reviewers are trusted contributors who have demonstrated understanding of the codebase.

### Contributors

Anyone who submits issues, pull requests, or participates in discussions.

## Decision Making

### Standard Changes

For most changes (bug fixes, minor features, documentation):

1. Submit a pull request
2. Receive at least one approval from a maintainer
3. Pass all CI checks
4. Maintainer merges the PR

### Significant Changes

For changes that affect public API, architecture, or add new packages:

1. Open a GitHub Discussion or Issue first
2. Gather feedback from maintainers and community
3. Submit PR with detailed description of the change
4. Receive maintainer approval after review

### Breaking Changes

Breaking changes require:

1. GitHub Discussion for design review
2. Clear migration guide in PR description
3. Changelog entry documenting the break
4. Explicit maintainer approval

## Code Review

### Requirements

- All PRs require at least one approval from a maintainer
- CI must pass (lint, typecheck, test, build)
- Changes to published packages require a changeset

### CODEOWNERS

The [CODEOWNERS](.github/CODEOWNERS) file defines code ownership:

- Package changes require approval from package maintainers
- CI/workflow changes require maintainer approval

## Release Process

1. Contributors add changesets via `pnpm changeset`
2. Changesets action creates a "Version Packages" PR
3. Maintainer reviews and merges the version PR
4. CI automatically publishes to npm

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines.

## Security

Security vulnerabilities should be reported privately. See [SECURITY.md](./SECURITY.md) for the disclosure process.

## Communication

- **Issues**: Bug reports and feature requests
- **Discussions**: Questions, ideas, and general discussion
- **Pull Requests**: Code contributions

## Changes to Governance

Changes to this governance document require maintainer approval and should be discussed in a GitHub Issue first.
