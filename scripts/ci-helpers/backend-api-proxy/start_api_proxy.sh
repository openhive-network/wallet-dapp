#! /bin/bash
set -euo pipefail

SCRIPTPATH="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

print_help () {
    cat <<-EOF
Usage: $0 
  This script starts a proxy pointed by environtment variables:
    - REST_BACKEND e.g.: http://ip:port
    - HIVE_BACKEND e.g.: http://ip:port
    - FRONTEND_APP e.g.: http://ip:port
    - EXPOSED_PORT a port exposed from the executing host e.g.: 18000
  --help|-h|-?                          Display this help screen and exit
EOF
}

_TST_EXPOSED_PORT=${EXPOSED_PORT:?"Missing EXPOSED_PORT variable"}
_TST_REST_BACKEND=${REST_BACKEND:?"Missing REST_BACKEND variable"}
_TST_HIVED_BACKEND=${HIVED_BACKEND:?"Missing HIVED_BACKEND variable"}
_TST_FRONTEND_APP=${FRONTEND_APP:?"Missing FRONTEND_APP variable"}

CONF_FILE="${SCRIPTPATH}/conf/upstream_vars.conf"

echo "set \$postgrest_backend ${REST_BACKEND};" > "${CONF_FILE}"
echo "set \$hive_backend ${HIVED_BACKEND};" >> "${CONF_FILE}"
echo "set \$frontend_app ${FRONTEND_APP};" >> "${CONF_FILE}"

pushd "${SCRIPTPATH}"

docker compose down --remove-orphans || true
docker compose up --force-recreate --wait
