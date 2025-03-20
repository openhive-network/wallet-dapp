#! /bin/bash
set -euo pipefail

SCRIPTPATH="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
SCRIPTSDIR="$SCRIPTPATH/.."

print_help () {
cat <<-EOF
  Usage: $0 <image_tag> <src_dir> <registry_url> [OPTION[=VALUE]]...

  Builds docker image containing Transaction Inspector application installation, ready to run. To spawn it, just run a container and map port 8080 to the host.
  OPTIONS:
      --help|-h|-?      Display this help screen and exit
      --progress=TYPE   Determines how to display build progress (default: 'auto')
      --push            Allows to automatically push built image to the registry
EOF
}

PROGRESS_DISPLAY=${PROGRESS_DISPLAY:-"auto"}
IMAGE_OUTPUT="--load"

BUILD_IMAGE_TAG=""
REGISTRY=""
SRCROOTDIR=""

while [ $# -gt 0 ]; do
  case "$1" in
    --help|-h|-?)
        print_help
        exit 0
        ;;
    --progress=*)
      arg="${1#*=}"
      PROGRESS_DISPLAY="$arg"
      ;;

    --push)
      IMAGE_OUTPUT="--push"
      ;;

    *)
    if [ -z "$BUILD_IMAGE_TAG" ];
    then
        BUILD_IMAGE_TAG="${1}"
    elif [ -z "$SRCROOTDIR" ];
    then
        SRCROOTDIR="${1}"
    elif [ -z "$REGISTRY" ];
    then
        REGISTRY=${1}
    else
        echo "ERROR: '$1' is not a valid option/positional argument"
        echo
        print_help
        exit 2
    fi
    ;;
    esac
    shift
done


_TST_IMGTAG=${BUILD_IMAGE_TAG:?"Missing arg #1 to specify built image tag"}
_TST_SRCDIR=${SRCROOTDIR:?"Missing arg #2 to specify source directory"}
_TST_REGISTRY=${REGISTRY:?"Missing arg #3 to specify target container registry"}

# Supplement a registry path by trailing slash (if needed)
#[[ "${REGISTRY}" != */ ]] && REGISTRY="${REGISTRY}/"

echo "Moving into source root directory: ${SRCROOTDIR}"

pushd "$SRCROOTDIR"

export DOCKER_BUILDKIT=1
BUILD_TIME="$(date -uIseconds)"
GIT_COMMIT_SHA="$(git rev-parse HEAD || true)"
if [ -z "$GIT_COMMIT_SHA" ]; then
  GIT_COMMIT_SHA="[unknown]"
fi

GIT_CURRENT_BRANCH="$(git branch --show-current || true)"
if [ -z "$GIT_CURRENT_BRANCH" ]; then
  GIT_CURRENT_BRANCH="$(git describe --abbrev=0 --all | sed 's/^.*\///' || true)"
  if [ -z "$GIT_CURRENT_BRANCH" ]; then
    GIT_CURRENT_BRANCH="[unknown]"
  fi
fi

GIT_LAST_LOG_MESSAGE="$(git log -1 --pretty=%B || true)"
if [ -z "$GIT_LAST_LOG_MESSAGE" ]; then
  GIT_LAST_LOG_MESSAGE="[unknown]"
fi

GIT_LAST_COMMITTER="$(git log -1 --pretty="%an <%ae>" || true)"
if [ -z "$GIT_LAST_COMMITTER" ]; then
  GIT_LAST_COMMITTER="[unknown]"
fi

GIT_LAST_COMMIT_DATE="$(git log -1 --pretty="%aI" || true)"
if [ -z "$GIT_LAST_COMMIT_DATE" ]; then
  GIT_LAST_COMMIT_DATE="[unknown]"
fi

echo -e "\nBuilding base instance image...\n"

docker buildx build --target=app \
  --progress="$PROGRESS_DISPLAY" \
  --build-arg BUILD_TIME="$BUILD_TIME" \
  --build-arg GIT_COMMIT_SHA="$GIT_COMMIT_SHA" \
  --build-arg GIT_CURRENT_BRANCH="$GIT_CURRENT_BRANCH" \
  --build-arg GIT_LAST_LOG_MESSAGE="$GIT_LAST_LOG_MESSAGE" \
  --build-arg GIT_LAST_COMMITTER="$GIT_LAST_COMMITTER" \
  --build-arg GIT_LAST_COMMIT_DATE="$GIT_LAST_COMMIT_DATE" \
  --tag "${REGISTRY}:${BUILD_IMAGE_TAG}" \
  "${IMAGE_OUTPUT}" \
  --file Dockerfile.nginx "$SRCROOTDIR"

echo -e "\nDone!\nBuilding instance image...\n"

echo "APP_IMAGE_NAME=$REGISTRY:$BUILD_IMAGE_TAG" > app_docker_image_name.env
{
  echo "APP_IMAGE_VERSION=$BUILD_IMAGE_TAG"
} >> app_docker_image_name.env

popd