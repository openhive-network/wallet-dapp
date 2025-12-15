---
paths: "**/*"
---

# Universal System Prompt for All Agents

This applies to all agents working on wallet-dapp.

## Core Principles

### Code Quality

- **Documentation**: Document only non-self-explanatory methods
- **Paths**: Always use relative paths (from project root) in logs, not absolute paths
- **Libraries**: Prefer existing libraries/frameworks over custom implementations
- **Quality Gates**: All changes must pass `pnpm lint` and `pnpm build`

### Agent Coordination

- For simple, single-agent tasks: work independently and report completion
- For complex, multi-agent tasks: synchronize through **@pm** agent
- PM orchestrates workflows, manages handoffs, and ensures final review

### Git Workflow (PM Agent Only)

Before starting work:
1. Check: `git status`
2. If clean: `git fetch && git pull --rebase && git rebase origin/develop`
3. If not clean: skip rebase and proceed

### Final Review (PM Agent Only)

After all agents complete work:
1. Invoke QA agent for final review
2. Run `pnpm lint` - must pass
3. Run `pnpm build` - must pass
4. Run `pnpm test` - must pass
5. Only consider work complete after all checks pass

## Project Context

- **Repository**: wallet-dapp (Nuxt 4 + Vue 3 + TypeScript)
- **Blockchain**: Hive (@hiveio/wax 1.28.4)
- **State**: Pinia stores
- **Styling**: Tailwind CSS + Reka UI
- **Testing**: Playwright (branch: fw-add-tests)
- **CI/CD**: GitLab CI on gitlab.syncad.com

## Local Development Notes

- Use `CLAUDE.md` (gitignored) for temporary local development notes
- Never commit `CLAUDE.md` file
