#!/usr/bin/env bash
# Build (and with --push, publish) the test runtime image of .aidev/runtime/Dockerfile
# and print the digest-pinned reference to put in .aidev/project.yaml's
# `environment.image`. See .aidev/README.md.
#
# The tag is `aidev-<hash>` of the image inputs (the Dockerfile, package.json,
# pnpm-lock.yaml, the resolved pnpm-workspace.yaml, .npmrc, prisma/schema.prisma,
# prisma.config.ts). When <repository>:aidev-<hash> is already in the registry
# nothing is built: the script prints its digest.
#
#   .aidev/runtime/build.sh           # registry digest, or build locally and print the local tag
#   .aidev/runtime/build.sh --push    # registry digest, or build + push and print repo@sha256:<digest>
#   .aidev/runtime/build.sh --tag     # print the input-hash tag only
#
# AIDEV_RUNTIME_BUILDER names a buildx builder (e.g. a region build builder).
set -euo pipefail
cd "$(dirname "$0")/../.."
REPOSITORY="${AIDEV_RUNTIME_REPOSITORY:-registry.gitlab.syncad.com/hive/wallet-dapp/aidev-tests}"
# pnpm-workspace.yaml is a symlink into the npm-common-config submodule: every
# input is read (and copied) through symlinks.
INPUTS=(package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc prisma.config.ts prisma/schema.prisma)
input_hash() {
    sha256sum .aidev/runtime/Dockerfile "${INPUTS[@]}" | sha256sum | cut -c1-16
}
[ -f pnpm-workspace.yaml ] || { echo "pnpm-workspace.yaml does not resolve: git submodule update --init" >&2; exit 1; }
TAG="aidev-$(input_hash)"
case "${1:-}" in
    --tag) echo "$TAG"; exit 0 ;;
    ""|--push) ;;
    *) echo "usage: $0 [--push|--tag]" >&2; exit 2 ;;
esac
registry_digest() {
    docker buildx imagetools inspect "$REPOSITORY:$TAG" --format '{{json .Manifest}}' 2>/dev/null \
        | grep -o '"digest": *"sha256:[0-9a-f]*"' | head -1 | grep -o 'sha256:[0-9a-f]*' || true
}
digest="$(registry_digest)"
if [ -n "$digest" ]; then
    echo "$REPOSITORY:$TAG exists in the registry; not building" >&2
    echo "$REPOSITORY@$digest"
    exit 0
fi
echo "$REPOSITORY:$TAG is not in the registry; building it" >&2
context="$(mktemp -d)"
trap 'rm -rf "$context"' EXIT
mkdir -p "$context/deps/prisma"
cp -L package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc prisma.config.ts "$context/deps/"
cp -L prisma/schema.prisma "$context/deps/prisma/"
build=(docker buildx build --pull --provenance=false -f .aidev/runtime/Dockerfile -t "$REPOSITORY:$TAG")
[ -z "${AIDEV_RUNTIME_BUILDER:-}" ] || build+=(--builder "$AIDEV_RUNTIME_BUILDER")
if [ "${1:-}" != "--push" ]; then
    "${build[@]}" --load "$context" >&2
    echo "$REPOSITORY:$TAG"
    exit 0
fi
"${build[@]}" --push --metadata-file "$context/metadata.json" "$context" >&2
digest="$(grep -o '"containerimage.digest": *"sha256:[0-9a-f]*"' "$context/metadata.json" | grep -o 'sha256:[0-9a-f]*')"
echo "$REPOSITORY@${digest:?no digest in buildx metadata}"
