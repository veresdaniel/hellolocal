#!/bin/bash
set -e

API_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE_ROOT="$(cd "$API_DIR/../.." && pwd)"

# Find Prisma client in workspace root
PRISMA_CLIENT=$(find "$WORKSPACE_ROOT/node_modules/.pnpm" -path "*/@prisma+client@*/node_modules/.prisma/client" -type d 2>/dev/null | head -1)

if [ -n "$PRISMA_CLIENT" ] && [ -d "$PRISMA_CLIENT" ]; then
  DST="$API_DIR/node_modules/.prisma/client"
  
  # Remove old client if exists
  [ -d "$DST" ] && rm -rf "$DST"
  
  # Copy to apps/api
  mkdir -p "$(dirname "$DST")"
  cp -r "$PRISMA_CLIENT" "$DST"
  echo "✅ Copied Prisma client to apps/api/node_modules/.prisma/client"
else
  echo "⚠️  Prisma client not found in workspace root"
fi

