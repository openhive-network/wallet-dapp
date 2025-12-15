---
description: Run Playwright E2E tests (requires fw-add-tests branch)
allowed-tools: Bash(git:*), Bash(pnpm:*), Bash(npx:*)
---

Run Playwright E2E tests.

## Context

- Current branch: !`git branch --show-current`
- Tests are in branch: fw-add-tests

## Task

1. Check if on test branch or if tests exist:

```bash
git ls-tree -r HEAD --name-only | grep -E '^__tests__/' | head -5
```

2. If tests exist, run them:

```bash
pnpm exec playwright test
```

3. If tests don't exist on current branch:
   - Inform user tests are in `fw-add-tests` branch
   - Offer to checkout that branch or cherry-pick test files

4. Report:
   - Test results summary
   - Failed tests with details
   - Screenshots/traces location if failures
