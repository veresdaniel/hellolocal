#!/bin/bash
# Beta only. Never calls the production compose project and never reads stack.env
# into the beta database URL.
#
# One-time server prep (not done by this script):
#   DNS A  beta.hello-local.io      -> 135.181.157.111
#   DNS A  api.beta.hello-local.io  -> 135.181.157.111
#   /opt/hellolocal/beta.env        own POSTGRES_PASSWORD and JWT_SECRET (mode 600)
#   main deployed with the Caddy import and the caddy-imports volume mount
#
# What this script runs:
#   git clone/fetch + reset --hard origin/staging in /opt/hellolocal/beta
#   docker compose -p hellolocal-beta -f deploy/docker-compose.beta.yml up -d --build
#   copy deploy/Caddyfile.beta to /opt/hellolocal/caddy-imports/beta.caddy
#   caddy reload, only when the running production Caddy already imports that directory
set -euo pipefail

BRANCH="${BRANCH:-staging}"
REPO="https://github.com/veresdaniel/hellolocal.git"
DIR=/opt/hellolocal/beta
ENV_FILE=/opt/hellolocal/beta.env
IMPORT_DIR=/opt/hellolocal/caddy-imports

if [ "$BRANCH" != "staging" ]; then
  echo "Ez a szkript csak a staging ágat telepíti (kapott: ${BRANCH})."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Hiányzik a ${ENV_FILE}."
  echo "Hozd létre a deploy/env.beta.example alapján, saját POSTGRES_PASSWORD és JWT_SECRET értékkel."
  echo "Ne másold ide a /opt/hellolocal/stack.env fájlt és ne állíts be production DATABASE_URL-t."
  exit 1
fi

if grep -E '^[[:space:]]*DATABASE_URL=' "$ENV_FILE" >/dev/null 2>&1; then
  echo "A ${ENV_FILE} DATABASE_URL-t tartalmaz. Vedd ki."
  echo "A beta a saját beta-db szolgáltatására és a hellolocal-beta-pgdata volume-ra épül, nem a production adatbázisra."
  exit 1
fi

if [ -f /opt/hellolocal/stack.env ]; then
  if ! awk -F= '
    FNR==NR {
      key=$1
      val=substr($0, index($0, "=")+1)
      if (key=="POSTGRES_PASSWORD" || key=="JWT_SECRET_PROD" || key=="JWT_SECRET_DEVEL") prod[key]=val
      next
    }
    {
      key=$1
      val=substr($0, index($0, "=")+1)
      if (key=="POSTGRES_PASSWORD" && val!="" && val==prod["POSTGRES_PASSWORD"]) bad=1
      if (key=="JWT_SECRET" && val!="" && (val==prod["JWT_SECRET_PROD"] || val==prod["JWT_SECRET_DEVEL"])) bad=1
    }
    END { exit (bad ? 2 : 0) }
  ' /opt/hellolocal/stack.env "$ENV_FILE"; then
    echo "A beta.env titkai egyeznek a production stack.env egy értékével."
    echo "Generálj új POSTGRES_PASSWORD és JWT_SECRET értéket. A production adatbázist ne használd."
    exit 1
  fi
fi

if ! grep -E '^POSTGRES_PASSWORD=.+' "$ENV_FILE" >/dev/null 2>&1; then
  echo "A ${ENV_FILE} POSTGRES_PASSWORD mezője üres."
  exit 1
fi

if ! grep -E '^JWT_SECRET=.+' "$ENV_FILE" >/dev/null 2>&1; then
  echo "A ${ENV_FILE} JWT_SECRET mezője üres."
  exit 1
fi

mkdir -p "$IMPORT_DIR"

if [ ! -d "$DIR/.git" ]; then
  GIT_TERMINAL_PROMPT=0 git clone --branch "$BRANCH" "$REPO" "$DIR"
fi

git -C "$DIR" fetch origin "$BRANCH"
git -C "$DIR" checkout "$BRANCH"
git -C "$DIR" reset --hard "origin/$BRANCH"

docker compose \
  --env-file "$ENV_FILE" \
  -f "$DIR/deploy/docker-compose.beta.yml" \
  --project-directory "$DIR" \
  -p hellolocal-beta \
  up -d --build

install -m 644 "$DIR/deploy/Caddyfile.beta" "$IMPORT_DIR/beta.caddy"

if docker exec hellolocal-caddy-1 test -d /etc/caddy/imports \
  && docker exec hellolocal-caddy-1 grep -F 'import /etc/caddy/imports/*.caddy' /etc/caddy/Caddyfile >/dev/null; then
  docker exec hellolocal-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
  echo "Beta stack fut, a Caddy újratöltötte a beta hostokat."
else
  echo "A beta stack elindult, de a futó production Caddy még nem importálja a /etc/caddy/imports könyvtárat."
  echo "A Caddyfile import és a volume mount a main ágon kell, hogy kikerüljön (a meglévő production workflow)."
  echo "Addig a tanúsítvány nem áll ki. Ezt a production compose projektet ez a szkript nem indítja újra és nem migrálja."
fi
