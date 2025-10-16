#!/usr/bin/env bash
set -euo pipefail

echo "Installing pre-commit and detect-secrets..."
if ! command -v pip >/dev/null 2>&1; then
  echo "pip not found. Please install Python and pip." >&2
  exit 1
fi

pip install --user pre-commit detect-secrets
echo "Installing pre-commit hooks..."
pre-commit install
echo "Initializing detect-secrets baseline (optional)..."
detect-secrets scan > .secrets.baseline || true
echo "Done."
