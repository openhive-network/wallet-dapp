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

Steps: `lint` is package.json's `lint-ci` (eslint, as CI's lint job), `typecheck` is `nuxt typecheck`, `build` is
`nuxt build` followed by `prisma db push` into a SQLite file under the slot's results (as
CI's build job), `e2e` is `playwright test --project=chromium-headless` over `__tests__/e2e`
and `__tests__/integration` with `CI=1`. Every run first installs `node_modules` offline
and runs the `postinstall` (`prisma generate`, `nuxt prepare`).

The suites run with no network: the endpoints the tests depend on are mocked
(`__tests__/helpers/api-mocks.ts` and the specs' own routes), and the whole of
`__tests__/e2e` and `__tests__/integration` runs.

## Test runtime

`.aidev/runtime/Dockerfile` builds on common-ci-configuration's `node-test-tools` and adds
a pnpm store filled from `pnpm-lock.yaml`, Prisma's schema engine for the lockfile's
`prisma` (`PRISMA_SCHEMA_ENGINE_BINARY`) and the Chromium headless shell of the lockfile's
`@playwright/test` in `/opt/pw-browsers`. Rebuild and re-pin it with
`.aidev/runtime/build.sh --push` when the Dockerfile, `package.json`, `pnpm-lock.yaml`,
`pnpm-workspace.yaml` (from the `npm-common-config` submodule), `.npmrc` or the Prisma
schema/config changes, or when common-ci-configuration republishes `node-test-tools:develop`
(e.g. a Node bump; the Dockerfile builds on that moving tag and takes Node from it), and
put the printed `repo@sha256:…` into `environment.image`.
The submodule must be checked out (`git submodule update --init`) for both the build and
the suites.
