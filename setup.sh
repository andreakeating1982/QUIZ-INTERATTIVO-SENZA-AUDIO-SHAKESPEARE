#!/bin/bash
# =============================================================================
# setup.sh — Genera un BETTER_AUTH_SECRET sicuro per il deploy manuale
# =============================================================================
# Usalo se NON usi render.yaml (es. deploy su Railway, VPS, o Docker locale).
# =============================================================================

BETTER_AUTH_SECRET=$(openssl rand -base64 32)

echo "=========================================="
echo "   Shakespeare Quiz — Setup"
echo "=========================================="
echo ""
echo "Aggiungi queste variabili al tuo ambiente:"
echo ""
echo "  NODE_ENV=production"
echo "  DATABASE_URL=postgresql://..."  # Sostituisci con la tua DB URL
echo "  BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET"
echo ""
echo "=========================================="
