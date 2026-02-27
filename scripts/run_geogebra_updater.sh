#!/usr/bin/env sh
set -eu

ROOT_DIR="${ROOT_DIR:-/app}"
SCRIPT_PATH="${ROOT_DIR}/scripts/update_geogebra_bundle.js"

if [ ! -f "$SCRIPT_PATH" ]; then
  echo "[geogebra-updater] missing script: $SCRIPT_PATH" >&2
  exit 1
fi

GGB_BUNDLE_URL="${GGB_BUNDLE_URL:-https://download.geogebra.org/package/geogebra-math-apps-bundle}"
GGB_BUNDLE_VERSION="${GGB_BUNDLE_VERSION:-}"
GGB_BUNDLE_SHA256="${GGB_BUNDLE_SHA256:-}"
GGB_RETAIN_RELEASES="${GGB_RETAIN_RELEASES:-3}"
GGB_BUNDLE_FORCE="${GGB_BUNDLE_FORCE:-false}"
GGB_NO_LOCK="${GGB_NO_LOCK:-false}"
GGB_LOCK_FILE="${GGB_LOCK_FILE:-}"
GGB_KEEP_TEMP="${GGB_KEEP_TEMP:-false}"

set -- node "$SCRIPT_PATH" --root "$ROOT_DIR" --url "$GGB_BUNDLE_URL" --retain "$GGB_RETAIN_RELEASES"

if [ -n "$GGB_BUNDLE_VERSION" ]; then
  set -- "$@" --version "$GGB_BUNDLE_VERSION"
fi

if [ -n "$GGB_BUNDLE_SHA256" ]; then
  set -- "$@" --sha256 "$GGB_BUNDLE_SHA256"
fi

if [ -n "$GGB_LOCK_FILE" ]; then
  set -- "$@" --lock-file "$GGB_LOCK_FILE"
fi

case "$(printf '%s' "$GGB_BUNDLE_FORCE" | tr '[:upper:]' '[:lower:]')" in
  1|true|yes|on)
    set -- "$@" --force
    ;;
esac

case "$(printf '%s' "$GGB_NO_LOCK" | tr '[:upper:]' '[:lower:]')" in
  1|true|yes|on)
    set -- "$@" --no-lock
    ;;
esac

case "$(printf '%s' "$GGB_KEEP_TEMP" | tr '[:upper:]' '[:lower:]')" in
  1|true|yes|on)
    set -- "$@" --keep-temp
    ;;
esac

echo "[geogebra-updater] start (root=${ROOT_DIR}, url=${GGB_BUNDLE_URL}, retain=${GGB_RETAIN_RELEASES})"
exec "$@"
