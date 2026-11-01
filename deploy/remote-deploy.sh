#!/bin/bash
set -euo pipefail

BRANCH="${BRANCH:-main}"
REPO="https://github.com/veresdaniel/hellolocal.git"

update_checkout() {
  local dir="$1"
  local branch="$2"
  if [ ! -d "$dir/.git" ]; then
    git clone --branch "$branch" "$REPO" "$dir"
  fi
  git -C "$dir" fetch origin "$branch"
  git -C "$dir" checkout "$branch"
  git -C "$dir" reset --hard "origin/$branch"
}

if [ ! -f /opt/hellolocal/stack.env ]; then
  echo "Hiányzik a /opt/hellolocal/stack.env. Előbb futtasd a deploy/bootstrap.sh szkriptet a szerveren."
  exit 1
fi

if [ "$BRANCH" = "main" ]; then
  update_checkout /opt/hellolocal/prod main
  SERVICES=(postgres caddy api-prod web-prod)
  PROFILE_ARGS=()
else
  update_checkout /opt/hellolocal/devel "$BRANCH"
  SERVICES=(api-devel web-devel)
  PROFILE_ARGS=(--profile devel)
fi

docker compose \
  --env-file /opt/hellolocal/stack.env \
  -f /opt/hellolocal/prod/deploy/docker-compose.yml \
  --project-directory /opt/hellolocal/prod \
  "${PROFILE_ARGS[@]}" \
  up -d --build "${SERVICES[@]}"
