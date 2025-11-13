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
  --detach                              Run in detached mode 
  --help|-h|-?                          Display this help screen and exit
EOF
}

IMAGE_NAME=${IMAGE_NAME:-""}
PORT=${PORT:-""}
CONTAINER_NAME=${CONTAINER_NAME:-"wallet-dapp"}
DETACH=${DETACH:-false}

CUSTOM_ENV_FILE=''

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
            CUSTOM_ENV_FILE="${arg}"
        else
            echo "ERROR: File '${arg}' not found"
            exit 2
        fi
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
    RUN_OPTIONS+=("--env-file" "${CUSTOM_ENV_FILE}")
else
    echo "ERROR: Env file must be specified at command line using option: --env-file"
    exit 2
fi

if [[ "$DETACH" == "true" ]]; then
    RUN_OPTIONS+=("--detach")
fi

(docker ps -q --filter "name=$CONTAINER_NAME" | grep -q . && docker stop "$CONTAINER_NAME") || true
docker container rm --force "$CONTAINER_NAME" || true

docker run "${RUN_OPTIONS[@]}" "$IMAGE_NAME"
