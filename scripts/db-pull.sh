#!/usr/bin/env bash
# Sync local D1 from remote. Upserts only — rows deleted remotely will
# persist locally. Run `wrangler d1 execute la28 --local --command='DELETE ...'`
# first if you need a strict mirror.
set -euo pipefail

TMP_DIR=".wrangler/tmp"
RAW="$TMP_DIR/la28-pull-raw.sql"
SQL="$TMP_DIR/la28-pull.sql"

mkdir -p "$TMP_DIR"

echo "Exporting remote D1..."
pnpm wrangler d1 export la28 --remote --no-schema --output="$RAW"

echo "Transforming INSERTs to upserts..."
grep -v d1_migrations "$RAW" | sed 's/^INSERT INTO/INSERT OR REPLACE INTO/' > "$SQL"

echo "Importing into local D1..."
pnpm wrangler d1 execute la28 --local --file="$SQL"

echo "Done."
