#!/bin/bash
# Mass-Code Linux Shell Launcher
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR" || exit 1
echo "[INFO] Booting Mass-Code Platform..."
if command -v npx >/dev/null 2>&1; then
    npx electron . "$@"
elif command -v npm >/dev/null 2>&1; then
    npm start "$@"
elif command -v electron >/dev/null 2>&1; then
    electron . "$@"
else
    echo "[ERROR] Node/Electron not found. Please run ./setup_env.sh first."
    exit 1
fi
