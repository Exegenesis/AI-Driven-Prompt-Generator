#!/usr/bin/env bash
set -euo pipefail

ARCH=$(uname -m)
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
BIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/bin"
mkdir -p "$BIN_DIR"

echo "Detecting platform: OS=$OS ARCH=$ARCH"

if [[ "$OS" == "linux" ]]; then
  PLATFORM="linux"
elif [[ "$OS" == "darwin" ]]; then
  PLATFORM="darwin"
else
  echo "Unsupported OS for automatic downloader: $OS" >&2
  exit 1
fi

if [[ "$ARCH" == "x86_64" || "$ARCH" == "amd64" ]]; then
  ARCH_TAG="x64"
elif [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
  ARCH_TAG="arm64"
else
  echo "Unsupported architecture: $ARCH" >&2
  exit 1
fi

TAG="v8.7.0"
FILE="gitleaks_${TAG}_${PLATFORM}_${ARCH_TAG}.tar.gz"
URL="https://github.com/zricethezav/gitleaks/releases/download/${TAG}/${FILE}"

echo "Downloading $URL"
curl -L -o /tmp/$FILE "$URL"
tar -xzf /tmp/$FILE -C /tmp
mv /tmp/gitleaks "$BIN_DIR/gitleaks"
chmod +x "$BIN_DIR/gitleaks"
echo "Downloaded gitleaks to $BIN_DIR/gitleaks"
