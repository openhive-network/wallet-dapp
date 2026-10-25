# Sourced by run-checks.sh from the repository root: bring node_modules up to
# date with pnpm-lock.yaml from the image's pnpm store, offline. Lifecycle
# scripts are skipped (the root `postinstall` is `prisma generate && nuxt
# prepare`, which run-checks.sh runs as its own `prepare` case on every run, so
# a source change without a lockfile change is still prepared). A marker records
# the lockfile and Node it was installed for; it is written only after an
# install that succeeded, and an install whose tools don't resolve is redone.
lock_id="$(sha256sum pnpm-lock.yaml | cut -d' ' -f1) $(node --version)"
marker=node_modules/.aidev-pnpm-lock
tools_present() {
    local t
    for t in nuxt eslint prisma playwright vue-tsc; do [ -x "node_modules/.bin/$t" ] || return 1; done
}
if [ ! -f pnpm-workspace.yaml ]; then
    echo "pnpm-workspace.yaml does not resolve (npm-common-config submodule not checked out)" >&2
    return 1
fi
if [ "$(cat "$marker" 2>/dev/null)" != "$lock_id" ] || ! tools_present; then
    echo "node_modules is not current for pnpm-lock.yaml: pnpm install --offline" >&2
    pnpm install --offline --frozen-lockfile --ignore-scripts < /dev/null || return 1
    tools_present || { echo "pnpm install left no nuxt/eslint/prisma/playwright/vue-tsc" >&2; return 1; }
    printf '%s\n' "$lock_id" > "$marker.tmp" && mv "$marker.tmp" "$marker"
fi
