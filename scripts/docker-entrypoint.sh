#!/bin/sh
# Entrypoint of the wallet-dapp image: seeds the data directory, then starts the Nuxt server.
set -e

DATA_DIR=/app/.data
SEED_DIR=/app/.data-init
DB_FILE=account-requests.sqlite

# The empty claims database (schema created during the image build) is copied only when the data
# directory holds none yet, so a deployment keeps its data across restarts and image updates.
if [ ! -e "$DATA_DIR/$DB_FILE" ]; then
    mkdir -p "$DATA_DIR"
    cp "$SEED_DIR/$DB_FILE" "$DATA_DIR/$DB_FILE"
fi

# Run the Nuxt server from the generated .output; the env file is bind-mounted by run_instance.sh --env-file
exec node --env-file=/app/mapped.env .output/server/index.mjs
