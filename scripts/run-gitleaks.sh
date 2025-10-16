#!/usr/bin/env bash
set -euo pipefail

# Prefer a repo-local gitleaks binary under scripts/bin; fall back to system gitleaks.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
BIN_DIR="$SCRIPT_DIR/bin"
LOCAL_BIN="$BIN_DIR/gitleaks"

if [ -x "$LOCAL_BIN" ]; then
  GITLEAKS="$LOCAL_BIN"
elif command -v gitleaks >/dev/null 2>&1; then
  GITLEAKS="$(command -v gitleaks)"
else
  echo "gitleaks not found locally or on PATH. Attempting automatic download to $BIN_DIR ..."
  mkdir -p "$BIN_DIR"
  if command -v bash >/dev/null 2>&1; then
    "$SCRIPT_DIR/get-gitleaks.sh" || true
  else
    echo "No bash available to run downloader; please run scripts/get-gitleaks.ps1 on Windows or install gitleaks manually." >&2
  fi
  if [ -x "$LOCAL_BIN" ]; then
    GITLEAKS="$LOCAL_BIN"
  else
    echo "gitleaks not available; please install gitleaks or run scripts/get-gitleaks.* to fetch a binary." >&2
    exit 1
  fi
fi

echo "Running gitleaks: $GITLEAKS"
"$GITLEAKS" detect --staged --exit-code 1 || {
  echo "gitleaks detected potential secrets. Commit aborted." >&2
  exit 1
}

echo "gitleaks passed."
