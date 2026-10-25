# Automated contributions

This directory configures the automated development platform that contributes to this
repository. This note says which branches it uses here and how its work reaches the
project's main line.

## Branches

- `aidev/integration` — the integration branch. Automated work lands here and nowhere else.
- `develop` — the project's main line; reached from `aidev/integration` only by merge request (`aidev handoff`, a linear one-commit-per-change copy on `aidev/handoff`, since `develop` is fast-forward only).
- `ai/*` — one branch per task, created and deleted by the platform. Do not commit to them.
- `session/*` — a session's accumulated work, landed on the integration branch as a batch.

## How work reaches the main line

Task and session branches never reach `aidev/integration` through merge requests; the platform
lands them after its own verification. `aidev/integration` reaches `develop` by this project's
usual process, merge requests included — the platform never merges into any other branch.

Whether this project's CI pipelines skip `ai/*` and `session/*` branches is decided by the
project's CI rules; maintainers record that decision here.

## Suites run before work lands

Declared in `.aidev/project.yaml` under `verification`, all through `.aidev/run-checks.sh`,
which writes `test-results/<slot>/junit.xml` (one case per step, plus Playwright's own junit
as `e2e-junit.xml`):

- `quick` — `command` .aidev/run-checks.sh quick lint build e2e
- `full` — `command` .aidev/run-checks.sh full build e2e
- `baseline` — `command` .aidev/run-checks.sh baseline build
- `canary` — `command` .aidev/run-checks.sh canary lint build e2e
- `static` — `command` .aidev/run-checks.sh static lint typecheck
- `coverage` — `command` .aidev/run-checks.sh coverage build
- `system` — `command` .aidev/run-checks.sh system build e2e

Steps: `lint` is `eslint` (CI's `lint-ci`), `typecheck` is `nuxt typecheck`, `build` is
`nuxt build` followed by `prisma db push` into a SQLite file under the slot's results (as
CI's build job), `e2e` is `playwright test --project=chromium-headless` over `__tests__/e2e`
and `__tests__/integration` with `CI=1`. Every run first installs `node_modules` offline
and runs the `postinstall` (`prisma generate`, `nuxt prepare`).

The suites run with no network. These tests pass with network and fail without it — the
page reaches the Hive node (`api.fake.openhive.network`, which the dev server is started
with) in ways their spec does not mock — and are left out of every slot
(`E2E_NEEDS_NETWORK` in `run-checks.sh`); the other 186 run:

- `account/account-management.spec.ts` — Account Details Display: *should display Hive Power (HP)*, *should display profile information* (no mocks in these tests).
- `account/account-request.spec.ts` — Mobile layout: *create account page should not scroll horizontally in any state*, *should scroll the password form into view…*; Create account page: the eleven tests that type an account name and wait for the method buttons to enable (the account-name validation stays pending offline).

Mocking the account-name lookup in those specs would bring them back into the slots.

## Test runtime

`.aidev/runtime/Dockerfile` builds on common-ci-configuration's `node-test-tools` and adds
a pnpm store filled from `pnpm-lock.yaml`, Prisma's schema engine for the lockfile's
`prisma` (`PRISMA_SCHEMA_ENGINE_BINARY`) and the Chromium headless shell of the lockfile's
`@playwright/test` in `/opt/pw-browsers`. Rebuild and re-pin it with
`.aidev/runtime/build.sh --push` when the Dockerfile, `package.json`, `pnpm-lock.yaml`,
`pnpm-workspace.yaml` (from the `npm-common-config` submodule), `.npmrc` or the Prisma
schema/config changes, and put the printed `repo@sha256:…` into `environment.image`.
The submodule must be checked out (`git submodule update --init`) for both the build and
the suites.

At onboarding (2026-10-25) `quick`, `full`, `canary`, `system`, `baseline` and `coverage`
pass offline; `static`'s `typecheck` fails on the existing code (11 errors: missing
`terser` types in `npm-common-config/ts-common/terser.ts`, possibly-undefined accesses in
`src/components/ui/copybutton/Button.vue` and
`server/api/google-drive/delete-wallet.delete.ts`, an unknown selector in
`__tests__/helpers/page-objects.ts`).

## Known state at onboarding (2026-10-25)

All slots pass offline except `static`: `nuxt typecheck` reports 11 existing type errors
(npm-common-config/ts-common/terser.ts, copybutton/Button.vue, delete-wallet.delete.ts,
page-objects.ts). 15 e2e tests are excluded by title (`E2E_NEEDS_NETWORK` in run-checks.sh)
because they reach live endpoints the specs do not mock. `nuxt.config.ts` reads `.git/HEAD`
as a path, which breaks in a git worktree. The lockfile's Playwright 1.57.0 needs
`PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64` on the Ubuntu 26.04 runtime.
