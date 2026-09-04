#!/bin/sh
# ============================================================
# docker-entrypoint.sh
# Esegue le migrazioni del database e avvia l'app
# ============================================================
set -e

echo "=========================================="
echo "  Shakespeare Quiz Interattivo"
echo "  Avvio container..."
echo "=========================================="

# Verifica che DATABASE_URL sia impostato
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERRORE: DATABASE_URL non è impostato."
  echo "   Per funzionare, il container ha bisogno di un database PostgreSQL."
  echo "   Esempio: export DATABASE_URL=postgresql://user:pass@host:5432/db"
  exit 1
fi

# Genera e applica le migrazioni del database
echo ""
echo "📦 Configurazione del database..."
npx drizzle-kit push --config=drizzle.config.ts
echo "✅ Database pronto!"

echo ""
echo "🚀 Avvio del server..."
echo "=========================================="
echo ""

# Esegui il comando passato come argomento (node dist/index.js)
exec "$@"
