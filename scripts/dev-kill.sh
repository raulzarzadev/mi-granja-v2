#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTLESS_STATE_DIR="${PORTLESS_STATE_DIR:-$HOME/.portless}"

kill_pid() {
  local pid="${1:-}"
  if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
  fi
}

kill_port() {
  local port="${1:-}"
  if [[ ! "$port" =~ ^[0-9]+$ ]]; then
    return
  fi

  local pids
  pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    while IFS= read -r pid; do
      kill_pid "$pid"
    done <<< "$pids"
  fi
}

echo "Stopping portless dev servers..."

if command -v portless >/dev/null 2>&1; then
  portless proxy stop >/dev/null 2>&1 || true
fi

if [[ -f "$PORTLESS_STATE_DIR/routes.json" ]]; then
  while IFS=$'\t' read -r pid port; do
    kill_pid "$pid"
    kill_port "$port"
  done < <(
    node - "$PORTLESS_STATE_DIR/routes.json" <<'NODE'
const fs = require('node:fs')
const file = process.argv[2]
try {
  const routes = JSON.parse(fs.readFileSync(file, 'utf8'))
  for (const route of routes) {
    if (route?.pid || route?.port) {
      console.log(`${route.pid || ''}\t${route.port || ''}`)
    }
  }
} catch {}
NODE
  )
fi

if [[ -f "$PORTLESS_STATE_DIR/proxy.pid" ]]; then
  kill_pid "$(cat "$PORTLESS_STATE_DIR/proxy.pid" 2>/dev/null || true)"
fi

if [[ -f "$PORTLESS_STATE_DIR/proxy.port" ]]; then
  kill_port "$(cat "$PORTLESS_STATE_DIR/proxy.port" 2>/dev/null || true)"
fi

# Last-resort cleanup for stale locks after processes are stopped.
rm -rf "$PORTLESS_STATE_DIR/routes.lock" 2>/dev/null || true
rm -f "$ROOT_DIR/apps/dashboard/.next/dev/lock" 2>/dev/null || true

echo "Dev servers stopped. Portless locks cleaned."
