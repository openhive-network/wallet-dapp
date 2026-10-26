# The image AIDEV runs this project's suites in (`environment.image` in
# .aidev/project.yaml). Suites run with `--network none` and the caller's uid, so
# everything they need is in the image:
#
# * common-ci-configuration's node-test-tools (Ubuntu 26.04, Node v24.21.0, pnpm,
#   Chromium's system libraries and fonts), the tool image CI's npm templates use;
# * a pnpm store filled from pnpm-lock.yaml (`pnpm fetch`), so `pnpm install
#   --offline` works in the sandbox. pnpm-workspace.yaml is a symlink into the
#   npm-common-config submodule; build.sh copies the resolved file;
# * Prisma's engines for the lockfile's prisma: a full install runs the
#   @prisma/engines build, which downloads them (it skips an engine whose
#   PRISMA_*_BINARY is set, hence the `unset`); the schema engine is kept in
#   /opt/prisma-engines and named by PRISMA_SCHEMA_ENGINE_BINARY, so `prisma
#   generate` and `prisma db push` need no download. The install also leaves the
#   build's side effects in the store's cache;
# * the Chromium (headless shell) of the lockfile's @playwright/test in
#   /opt/pw-browsers (the lockfile's Playwright comes from npm-common-config's
#   playwright-toolset catalog, the one the base image is built for).
#
# Build and pin it with .aidev/runtime/build.sh; see .aidev/README.md.
FROM registry.gitlab.syncad.com/hive/common-ci-configuration/node-test-tools@sha256:c15f6782c675ddbe8a5d5b05cfa27cfa7b606ecd8bc67a3b5d0c2206f2733994
USER root
ENV HOME=/tmp \
    npm_config_store_dir=/opt/pnpm-store \
    npm_config_manage_package_manager_versions=false \
    PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
    PRISMA_SCHEMA_ENGINE_BINARY=/opt/prisma-engines/schema-engine \
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    NUXT_TELEMETRY_DISABLED=1 \
    HUSKY=0 \
    DO_NOT_TRACK=1
COPY deps/ /tmp/deps/
RUN cd /tmp/deps \
    && unset PRISMA_SCHEMA_ENGINE_BINARY \
    && pnpm fetch \
    && node -e 'const f="package.json",p=require("./"+f);delete p.scripts.postinstall;require("fs").writeFileSync(f,JSON.stringify(p,null,2))' \
    && pnpm install --frozen-lockfile --prefer-offline \
    && mkdir -p /opt/prisma-engines \
    && cp "$(find node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines -maxdepth 1 -name 'schema-engine-*' -type f | head -1)" /opt/prisma-engines/schema-engine \
    && chmod a+rx /opt/prisma-engines/schema-engine \
    && /opt/prisma-engines/schema-engine --version \
    && PRISMA_SCHEMA_ENGINE_BINARY=/opt/prisma-engines/schema-engine pnpm exec prisma generate \
    && pnpm exec playwright --version \
    && pnpm exec playwright install chromium-headless-shell \
    && cd / && rm -rf /tmp/deps /tmp/.cache /tmp/.npm \
    && chmod -R a+rwX /opt/pnpm-store /opt/pw-browsers
