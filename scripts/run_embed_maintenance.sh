#!/usr/bin/env sh
set -eu

ROOT_DIR="${ROOT_DIR:-/app}"
SCRIPT_PATH="${ROOT_DIR}/scripts/update_embed_maintenance.js"
EMBED_UPDATER_FORCE="${EMBED_UPDATER_FORCE:-false}"

if [ ! -f "$SCRIPT_PATH" ]; then
  echo "[embed-maintenance] missing script: $SCRIPT_PATH" >&2
  exit 1
fi

set -- node "$SCRIPT_PATH" --root "$ROOT_DIR"

case "$(printf '%s' "$EMBED_UPDATER_FORCE" | tr '[:upper:]' '[:lower:]')" in
  1|true|yes|on)
    set -- "$@" --force
    ;;
esac

echo "[embed-maintenance] start (root=${ROOT_DIR})"
exec "$@"
