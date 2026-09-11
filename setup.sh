#!/usr/bin/env bash
# ExamCrack / StudyLocus — one-command environment setup.
#
# The .env files are gitignored, so they never travel with the repo.
# Run this after every fresh clone / migration to regenerate them, then
# restart the services. Existing .env files are left untouched.
#
#   bash setup.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ENV="$ROOT/backend/.env"
FRONTEND_ENV="$ROOT/frontend/.env"

# --- backend/.env -----------------------------------------------------------
if [ -f "$BACKEND_ENV" ]; then
  echo "✓ backend/.env already exists — leaving it as is."
else
  JWT_SECRET="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))' 2>/dev/null || openssl rand -hex 32)"
  MONGO_URL="${MONGO_URL:-mongodb://localhost:27017}"
  DB_NAME="${DB_NAME:-examcrack}"
  cat > "$BACKEND_ENV" <<EOF
MONGO_URL=$MONGO_URL
DB_NAME=$DB_NAME
JWT_SECRET=$JWT_SECRET
CORS_ORIGINS=*
EOF
  echo "✓ Created backend/.env (generated a fresh JWT_SECRET)."
fi

# --- frontend/.env ----------------------------------------------------------
if [ -f "$FRONTEND_ENV" ]; then
  echo "✓ frontend/.env already exists — leaving it as is."
else
  # Frontend and backend share the same host via ingress, so an empty
  # REACT_APP_BACKEND_URL makes the app call its own origin (see src/lib/api.js).
  # That is migration-proof — no stale host to get wrong. Override by exporting
  # REACT_APP_BACKEND_URL before running this script if you need a custom host.
  BACKEND_URL="${REACT_APP_BACKEND_URL:-}"
  cat > "$FRONTEND_ENV" <<EOF
REACT_APP_BACKEND_URL=$BACKEND_URL
WDS_SOCKET_PORT=443
EOF
  if [ -n "$BACKEND_URL" ]; then
    echo "✓ Created frontend/.env (REACT_APP_BACKEND_URL=$BACKEND_URL)."
  else
    echo "✓ Created frontend/.env (blank backend URL → uses same-origin, migration-proof)."
  fi
fi

echo ""
echo "Done. Now restart the services:"
echo "  sudo supervisorctl restart backend frontend"
