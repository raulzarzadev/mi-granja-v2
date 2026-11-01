#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EMU_PID=""
DEV_PID=""
STRIPE_PID=""
STRIPE_TAIL_PID=""
STRIPE_TMP_DIR=""
CLEANED_UP=0
EMU_CONFIG=""

# Stop descendants before their parent; never kill unrelated port listeners.
kill_tree() {
  local pid="$1" child
  while read -r child; do
    [[ -n "$child" ]] && kill_tree "$child"
  done < <(pgrep -P "$pid" 2>/dev/null || true)
  kill "$pid" 2>/dev/null || true
}

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
    kill_tree "$DEV_PID" 2>/dev/null || true
  fi
  if [[ -n "$STRIPE_TAIL_PID" ]]; then
    kill "$STRIPE_TAIL_PID" 2>/dev/null || true
  fi
  if [[ -n "$STRIPE_PID" ]]; then
    kill_tree "$STRIPE_PID" 2>/dev/null || true
  fi
  if [[ -n "$EMU_PID" ]]; then
    kill_tree "$EMU_PID" 2>/dev/null || true
  fi

  wait "$DEV_PID" "$STRIPE_TAIL_PID" "$STRIPE_PID" "$EMU_PID" 2>/dev/null || true
  [[ -n "$EMU_CONFIG" ]] && rm -f "$EMU_CONFIG"

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

# `stripe login --interactive` no guarda account_id; se resuelve con la clave
if [[ -z "$CONFIGURED_STRIPE_ACCOUNT_ID" && -n "$STRIPE_TEST_KEY" ]]; then
  CONFIGURED_STRIPE_ACCOUNT_ID="$(
    curl -s https://api.stripe.com/v1/account -u "$STRIPE_TEST_KEY:" |
      grep -Eo '"id": *"acct_[A-Za-z0-9]+"' | head -n 1 | grep -Eo 'acct_[A-Za-z0-9]+' || true
  )"
fi

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

EMU_CONFIG="$(mktemp "$ROOT_DIR/firebase/.emulators-runtime.XXXXXX")"
EMU_ENV="$(node scripts/emulator-config.mjs "$EMU_CONFIG")" || exit 1
eval "$EMU_ENV"
echo "Iniciando Firebase Emulators (UI: http://127.0.0.1:$EMULATOR_UI_PORT)..."
(cd firebase && exec pnpm exec firebase emulators:start --config "$EMU_CONFIG" --import=data --export-on-exit=data) &
EMU_PID=$!

# The hub only reports running emulators once their startup has completed.
EMU_READY=0
for _ in $(seq 1 120); do
  if ! kill -0 "$EMU_PID" 2>/dev/null; then
    echo "Error: Firebase terminó antes de iniciar."
    exit 1
  fi
  if curl --silent --fail --max-time 2 "http://127.0.0.1:$EMULATOR_HUB_PORT/emulators" | node -e '
    let data = ""; process.stdin.on("data", chunk => data += chunk);
    process.stdin.on("end", () => { try {
      const e = JSON.parse(data); process.exit(e.auth && e.firestore && e.storage ? 0 : 1)
    } catch { process.exit(1) } })'; then
    EMU_READY=1
    break
  fi
  sleep 1
done
if [[ "$EMU_READY" != 1 ]]; then
  echo "Error: Firebase no estuvo listo en 120 segundos."
  exit 1
fi

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

echo "Error: uno de los servicios del entorno local se detuvo."
exit 1
