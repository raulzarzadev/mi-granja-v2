#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EMU_PID=""
DEV_PID=""
STRIPE_PID=""
STRIPE_TAIL_PID=""
STRIPE_TMP_DIR=""
CLEANED_UP=0

STRIPE_ACCOUNT_ID="acct_1T78x8E6AQhnToix"
STRIPE_PRICE_INICIAL="price_1U35G1E6AQhnToixVGAiFTmY"
STRIPE_PRICE_BASICO="price_1U35G1E6AQhnToixSGCTinLK"
STRIPE_PRICE_PRO="price_1U35G1E6AQhnToixeY2mmW3u"
STRIPE_PRICE_RANCHO="price_1U35G2E6AQhnToixOu8b99CG"

cleanup() {
  if [[ "$CLEANED_UP" -eq 1 ]]; then
    return
  fi

  CLEANED_UP=1
  trap - EXIT INT TERM

  echo ""
  echo "Deteniendo app, Stripe y emuladores..."

  if [[ -n "$DEV_PID" ]]; then
    kill "$DEV_PID" 2>/dev/null || true
  fi
  if [[ -n "$STRIPE_TAIL_PID" ]]; then
    kill "$STRIPE_TAIL_PID" 2>/dev/null || true
  fi
  if [[ -n "$STRIPE_PID" ]]; then
    kill "$STRIPE_PID" 2>/dev/null || true
  fi
  if [[ -n "$EMU_PID" ]]; then
    kill "$EMU_PID" 2>/dev/null || true
  fi

  wait "$DEV_PID" "$STRIPE_TAIL_PID" "$STRIPE_PID" "$EMU_PID" 2>/dev/null || true
  pnpm dev:kill >/dev/null 2>&1 || true
  pnpm emu:kill >/dev/null 2>&1 || true

  if [[ -n "$STRIPE_TMP_DIR" && -d "$STRIPE_TMP_DIR" ]]; then
    rm -f "$STRIPE_TMP_DIR/listen.log"
    rmdir "$STRIPE_TMP_DIR" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

cd "$ROOT_DIR"

if ! command -v stripe >/dev/null 2>&1; then
  echo "Error: Stripe CLI no está instalado."
  exit 1
fi

STRIPE_CONFIG_FILE="${XDG_CONFIG_HOME:-$HOME/.config}/stripe/config.toml"
if [[ ! -f "$STRIPE_CONFIG_FILE" ]]; then
  echo "Error: Stripe CLI no está autenticado. Ejecuta: stripe login"
  exit 1
fi

CONFIGURED_STRIPE_ACCOUNT_ID="$(
  awk -F " = " '$1 == "account_id" { gsub(/\047/, "", $2); print $2; exit }' \
    "$STRIPE_CONFIG_FILE"
)"
STRIPE_TEST_KEY="$(
  awk -F " = " '$1 == "test_mode_api_key" { gsub(/\047/, "", $2); print $2; exit }' \
    "$STRIPE_CONFIG_FILE"
)"

if [[ "$CONFIGURED_STRIPE_ACCOUNT_ID" != "$STRIPE_ACCOUNT_ID" ]]; then
  echo "Error: Stripe CLI no está conectado a MiGranjaApp sandbox."
  echo "Cuenta esperada: $STRIPE_ACCOUNT_ID"
  echo "Cuenta actual: ${CONFIGURED_STRIPE_ACCOUNT_ID:-ninguna}"
  exit 1
fi

if [[ -z "$STRIPE_TEST_KEY" ]]; then
  echo "Error: no se encontró la clave sandbox de Stripe CLI. Ejecuta: stripe login"
  exit 1
fi

echo "Iniciando Firebase Emulators..."
pnpm emu &
EMU_PID=$!

echo "Iniciando listener de Stripe sandbox..."
STRIPE_TMP_DIR="$(mktemp -d)"
STRIPE_LOG="$STRIPE_TMP_DIR/listen.log"
stripe listen \
  --skip-verify \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted \
  --forward-to http://dashboard.localhost:1355/api/billing/webhook \
  >"$STRIPE_LOG" 2>&1 &
STRIPE_PID=$!

STRIPE_WEBHOOK_SECRET=""
for _ in $(seq 1 300); do
  STRIPE_WEBHOOK_SECRET="$(grep -Eo 'whsec_[A-Za-z0-9]+' "$STRIPE_LOG" | head -n 1 || true)"
  if [[ -n "$STRIPE_WEBHOOK_SECRET" ]]; then
    break
  fi
  if ! kill -0 "$STRIPE_PID" 2>/dev/null; then
    echo "Error: Stripe listener terminó antes de iniciar."
    sed -n '1,20p' "$STRIPE_LOG"
    exit 1
  fi
  sleep 0.1
done

if [[ -z "$STRIPE_WEBHOOK_SECRET" ]]; then
  echo "Error: Stripe no entregó un webhook signing secret."
  exit 1
fi

tail -n +1 -f "$STRIPE_LOG" &
STRIPE_TAIL_PID=$!

echo "Iniciando aplicaciones con billing sandbox..."
env \
  NEXT_PUBLIC_APP_URL=http://dashboard.localhost:1355 \
  STRIPE_SECRET_KEY="$STRIPE_TEST_KEY" \
  STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
  STRIPE_PRICE_INICIAL="$STRIPE_PRICE_INICIAL" \
  STRIPE_PRICE_BASICO="$STRIPE_PRICE_BASICO" \
  STRIPE_PRICE_PRO="$STRIPE_PRICE_PRO" \
  STRIPE_PRICE_RANCHO="$STRIPE_PRICE_RANCHO" \
  pnpm dev &
DEV_PID=$!

echo ""
echo "Entorno local listo: Firebase + apps + Stripe sandbox."
echo "Dashboard: http://dashboard.localhost:1355"
echo "Landing:   http://landing.localhost:1355"
echo "Presiona Ctrl+C para detener todo."

while kill -0 "$EMU_PID" 2>/dev/null && \
  kill -0 "$STRIPE_PID" 2>/dev/null && \
  kill -0 "$DEV_PID" 2>/dev/null; do
  sleep 1
done
