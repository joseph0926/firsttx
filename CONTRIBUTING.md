# Contributing to FirstTx

Thank you for your interest in contributing to FirstTx. This document explains how to participate in the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Convention](#commit-convention)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10.26.0+
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/firsttx.git
   cd firsttx
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

### Project Structure

```
firsttx/
├── apps/
│   ├── docs/          # Documentation site
│   └── playground/    # Interactive demo
├── packages/
│   ├── prepaint/      # Screen capture & restore
│   ├── local-first/   # IndexedDB sync
│   ├── tx/            # Transaction management
│   ├── devtools/      # Chrome DevTools extension
│   └── shared/        # Shared utilities
└── docs/              # Additional documentation
```

## Development Workflow

### Running Development Server

```bash
# Run all packages in dev mode
pnpm dev

# Run specific package
pnpm --filter @firsttx/prepaint dev
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run tests for specific package
pnpm --filter @firsttx/local-first test
```

### Linting and Type Checking

```bash
# Lint
pnpm lint

# Type check
pnpm typecheck

# Format code
pnpm format
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @firsttx/tx build
```

## Pull Request Process

### Before Submitting

1. Ensure all tests pass: `pnpm test:run`
2. Ensure no lint errors: `pnpm lint`
3. Ensure type checking passes: `pnpm typecheck`
4. Update documentation if needed
5. Add changeset if your change affects published packages:
   ```bash
   pnpm changeset
   ```

### PR Checklist

- [ ] Tests added/updated for the changes
- [ ] Documentation updated (if applicable)
- [ ] Changeset added (if affecting published packages)
- [ ] No breaking changes OR breaking changes documented
- [ ] Self-reviewed the code

### Review Process

1. A maintainer will review your PR
2. Address any feedback
3. Once approved, a maintainer will merge the PR

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Export types alongside implementations

### React

- Use functional components with hooks
- Follow React 19 best practices
- Avoid unnecessary re-renders

### General

- Keep functions small and focused
- Write self-documenting code
- Add comments only when the "why" is not obvious
- Prefer composition over inheritance

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Description                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only                                      |
| `style`    | Code style (formatting, semicolons, etc.)               |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or updating tests                                |
| `chore`    | Maintenance tasks                                       |
| `ci`       | CI/CD changes                                           |

### Scopes

| Scope         | Description                  |
| ------------- | ---------------------------- |
| `prepaint`    | @firsttx/prepaint package    |
| `local-first` | @firsttx/local-first package |
| `tx`          | @firsttx/tx package          |
| `devtools`    | @firsttx/devtools package    |
| `shared`      | @firsttx/shared package      |
| `playground`  | Playground app               |
| `docs`        | Documentation                |
| `deps`        | Dependencies                 |

### Examples

```
feat(prepaint): add overlay option for duplicate prevention
fix(local-first): resolve cross-tab sync race condition
docs: update API reference for useSyncedModel
chore(deps): bump typescript to 5.9
```

## Issue Guidelines

### Bug Reports

Use the bug report template and include:

- Which package is affected
- Expected vs actual behavior
- Steps to reproduce
- Environment (browser, OS)

### Feature Requests

Use the feature request template and include:

- Problem you're trying to solve
- Proposed solution
- Alternatives you've considered

### Questions

For questions, please use [GitHub Discussions](https://github.com/joseph0926/firsttx/discussions) instead of issues.

---

## Need Help?

- Check existing [issues](https://github.com/joseph0926/firsttx/issues)
- Read the [documentation](https://www.firsttx.store)
- Email: joseph0926.dev@gmail.com

Thank you for contributing!
