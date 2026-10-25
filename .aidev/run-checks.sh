#!/usr/bin/env bash
# Run the checks named after the suite and write test-results/<suite>/junit.xml.
#
#   .aidev/run-checks.sh <suite> <step>...
#
# Every run first installs node_modules offline (.aidev/pnpm-deps.sh) and runs
# the root `postinstall` as the `prepare` case (`prisma generate`, `nuxt
# prepare`: the lint config and the typecheck read .nuxt/). Steps, one junit
# case each (e2e also keeps Playwright's own junit):
#
#   lint       eslint over the repository (package.json `lint-ci`, CI's lint job)
#   typecheck  nuxt typecheck (vue-tsc)
#   build      nuxt build (CI's build job), then `prisma db push` of the account
#              claims schema into a SQLite file under test-results/<suite>/ as
#              CI's build job does (the build itself needs no database)
#   e2e        Playwright, project chromium-headless, __tests__/e2e and
#              __tests__/integration (API mocks of __tests__/helpers/api-mocks.ts)
#              without the tests in E2E_NEEDS_NETWORK below. CI=1 (junit
#              reporter, forbidOnly, retries), E2E_WORKERS workers.
#
# Runs offline in the image of .aidev/runtime/Dockerfile.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
root="$PWD"
suite="${1:?usage: $0 <suite> <step>...}"; shift
out="$root/test-results/$suite"
rm -rf "$out"; mkdir -p "$out"
cases="$out/cases.tsv"; : > "$cases"
source .aidev/junit-helpers.sh

# The tests that need the network, left out of every slot (--grep-invert): they
# pass with network and fail under `--network none` because the page reaches an
# endpoint their spec does not mock (the Hive node api.fake.openhive.network the
# dev server is started with). Patterns are Playwright title regexes; see
# .aidev/README.md. Playwright matches them against the titles joined by spaces
# (describe titles, then the test title). Everything else in __tests__/e2e and __tests__/integration runs.
E2E_NEEDS_NETWORK=(
    'Account Details Display should display Hive Power \(HP\)'
    'Account Details Display should display profile information'
    'Mobile layout create account page should not scroll horizontally in any state'
    'Mobile layout should scroll the password form into view'
    'Create account page should lowercase the account name typed with capital letters'
    'Create account page should suggest a free account name that passes validation'
    'Create account page should keep MetaMask unavailable when the extension is not detected'
    'Create account page should redirect to Google sign-in right after choosing Google without a session'
    'Create account page should resume the Google registration automatically'
    'Create account page should ask for a recovery password when Google is connected'
    'Create account page should reveal password fields only after choosing the password method'
    'Create account page should create the account with password derived keys'
    'Create account page should return to the form and show the backend rejection'
    'Create account page should show the already used state when a failed request used the token up'
    'Create account page should keep showing the created account with its public keys after a page reload'
)
# CI=1 makes the config use one worker; the specs are fullyParallel and pass
# with several, which keeps the slot to a few minutes.
E2E_WORKERS="${E2E_WORKERS:-4}"

status=0
step() {
    local name="$1"; shift
    local log="$out/$name.log" t0=$SECONDS rc=0
    echo "== $name" >&2
    ( cd "$root" && "$@" ) > "$log" 2>&1 < /dev/null || rc=$?
    if [ "$rc" -eq 0 ]; then
        printf 'case\t%s\tpass\t%s\t\n' "$name" "$((SECONDS - t0))" >> "$cases"
    else
        status=1; tail -40 "$log" >&2
        printf 'case\t%s\tfail\t%s\texit %s\t%s\n' "$name" "$((SECONDS - t0))" "$rc" "$log" >> "$cases"
    fi
    return "$rc"
}

if ! source "$root/.aidev/pnpm-deps.sh"; then
    printf 'case\tinstall\tfail\t0\tpnpm install --offline failed\n' >> "$cases"
    junit_write_cases "$out/junit.xml" "$suite" "$cases"
    exit 1
fi
if ! step prepare bash -c 'pnpm exec prisma generate && pnpm exec nuxt prepare'; then
    junit_write_cases "$out/junit.xml" "$suite" "$cases"
    exit 1
fi

build() {
    pnpm exec nuxt build || return 1
    NUXT_ACCOUNT_REQUEST_DATABASE_URL="file:$out/account-requests.sqlite" pnpm exec prisma db push
}

# Playwright empties its outputDir (test-results/ in playwright.config.ts) at
# start, which would take this suite's directory with it: --output moves it
# under the suite. The junit reporter's file is fixed by the config
# (test-results/junit.xml); it is copied next to this suite's junit.
e2e() {
    local junit="$root/test-results/junit.xml" rc=0
    rm -f "$junit"
    local skip
    skip="$(IFS='|'; echo "${E2E_NEEDS_NETWORK[*]}")"
    CI=1 run_with_junit_fallback "$junit" e2e \
        pnpm exec playwright test --project=chromium-headless --workers="$E2E_WORKERS" \
        --output "$out/playwright" --grep-invert "$skip" __tests__/e2e __tests__/integration || rc=$?
    [ -f "$junit" ] && cp "$junit" "$out/e2e-junit.xml"
    return "$rc"
}

for s in "$@"; do
    case "$s" in
        lint) step lint pnpm exec eslint ;;
        typecheck) step typecheck pnpm exec nuxt typecheck ;;
        build) step build build ;;
        e2e) step e2e e2e ;;
        *) printf 'case\t%s\tfail\t0\tunknown step\n' "$s" >> "$cases"; status=1 ;;
    esac
done
junit_write_cases "$out/junit.xml" "$suite" "$cases"
exit "$status"
