#! /bin/bash

set -xe

print_help () {
    cat <<-EOF
Usage: $0 [OPTION[=VALUE]]...

Run a Docker container instance running wallet-dapp application.
OPTIONS:
  --image=IMAGE                         Docker image to run (Obligatory)
  --port=PORT                           Port to be exposed (Obligatory)
  --name=NAME                           Container name to be used (default: wallet-dapp)
  --env-file=deployment.env             Obligatory path to a file containing environment variables to override i.e. deployment secrets
  --data-dir=DIR                        Persistent host directory mounted at /app/.data for the SQLite claims database; the container
                                        seeds it on the first start (created when missing; relative paths are resolved against the current directory)
  --detach                              Run in detached mode
  --help|-h|-?                          Display this help screen and exit
EOF
}

IMAGE_NAME=${IMAGE_NAME:-""}
PORT=${PORT:-""}
CONTAINER_NAME=${CONTAINER_NAME:-"wallet-dapp"}
DETACH=${DETACH:-false}

CUSTOM_ENV_FILE=''
DATA_DIR=''

while [ $# -gt 0 ]; do
  case "$1" in
    --image=*)
        arg="${1#*=}"
        IMAGE_NAME="$arg"
        ;;
    --port=*)
        arg="${1#*=}"
        PORT="$arg"
        ;;
    --name=*)
        arg="${1#*=}"
        CONTAINER_NAME="$arg"
        ;;
    --detach)
        DETACH=true
        ;;
    --env-file=*)
        arg="${1#*=}"
        if [ -f "${arg}" ]; then
            # Docker treats a relative bind-mount source as a named volume, so pass the resolved path.
            CUSTOM_ENV_FILE="$(realpath "${arg}")"
        else
            echo "ERROR: File '${arg}' not found"
            exit 2
        fi
        ;;
    --data-dir=*)
        DATA_DIR="${1#*=}"
        ;;
    --help|-?)
        print_help
        exit 0
        ;;
    *)
        echo "ERROR: '$1' is not a valid option/positional argument"
        echo
        print_help
        exit 2
        ;;
    esac
    shift
done

_TST_IMGTAG=${IMAGE_NAME:?"Missing image name: use --image=IMG option to specify built image tag"}
_TST_PORT=${PORT:?"Missing port: use --port=PORT_NUM option to specify port"}

RUN_OPTIONS=(
    "--rm"
    "--publish" "$PORT:8080"
    "--name" "$CONTAINER_NAME"
)

if [ -n "${CUSTOM_ENV_FILE}" ]; then
    RUN_OPTIONS+=("-v" "${CUSTOM_ENV_FILE}:/app/mapped.env")
else
    echo "ERROR: Env file must be specified at command line using option: --env-file"
    exit 2
fi

# Mount the persistent data directory - the container seeds the SQLite claims database into it on the first start.
# Docker only bind-mounts absolute paths - a relative one is treated as a named volume - so the directory
# is created first and its real path (relative to the current directory, symlinks resolved) is mounted.
if [ -n "${DATA_DIR}" ]; then
    mkdir -p "${DATA_DIR}"
    DATA_DIR="$(realpath "${DATA_DIR}")"
    RUN_OPTIONS+=("-v" "${DATA_DIR}:/app/.data")
fi

if [[ "$DETACH" == "true" ]]; then
    RUN_OPTIONS+=("--detach")
fi

(docker ps -q --filter "name=$CONTAINER_NAME" | grep -q . && docker stop "$CONTAINER_NAME") || true
docker container rm --force "$CONTAINER_NAME" || true

docker run "${RUN_OPTIONS[@]}" "$IMAGE_NAME"
