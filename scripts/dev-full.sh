#!/usr/bin/env bash
# Arranca emuladores + dashboard + stripe webhook listener
# Uso: pnpm dev:full

set -e

cleanup() {
  echo ""
  echo "Deteniendo procesos..."
  kill $PID_EMU $PID_DASH $PID_STRIPE 2>/dev/null
  wait $PID_EMU $PID_DASH $PID_STRIPE 2>/dev/null
  echo "Listo."
}
trap cleanup EXIT INT TERM

# 1. Firebase Emulators
echo "🔥 Iniciando Firebase Emulators..."
cd firebase && firebase emulators:start --import=data --export-on-exit=data &
PID_EMU=$!
cd ..

# Esperar a que Firestore emulator este listo
echo "⏳ Esperando emuladores..."
for i in $(seq 1 30); do
  curl -s http://localhost:8080/ > /dev/null 2>&1 && break
  sleep 1
done

# 2. Dashboard (Next.js)
echo "📊 Iniciando Dashboard..."
pnpm dev:dashboard &
PID_DASH=$!

# 3. Stripe webhook listener
if command -v stripe &> /dev/null; then
  echo "💳 Iniciando Stripe webhook listener..."
  stripe listen --forward-to localhost:3000/api/billing/webhook &
  PID_STRIPE=$!
else
  echo "⚠️  Stripe CLI no instalado, omitiendo webhook listener"
  echo "   Instala con: brew install stripe/stripe-cli/stripe"
  PID_STRIPE=""
fi

echo ""
echo "✅ Todo corriendo:"
echo "   🔥 Emulators UI:  http://localhost:4000"
echo "   📊 Dashboard:     http://localhost:3000"
echo "   💳 Stripe listen: activo (webhooks → localhost:3000/api/billing/webhook)"
echo ""
echo "   Ctrl+C para detener todo"
echo ""

wait
