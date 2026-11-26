#!/bin/bash
set -euo pipefail

BRANCH="${BRANCH:-main}"
REPO="https://github.com/veresdaniel/hellolocal.git"

if [ "$BRANCH" = "staging" ]; then
  echo "A staging ág a beta környezet. Használd a deploy/remote-deploy-beta.sh szkriptet."
  echo "Ez a szkript a hellolocal production Postgresre telepítene, ezért megáll."
  exit 1
fi

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

# Interrupted `compose up` recreates leave names like `<id>_hellolocal-api-prod-1`
# that block the next recreate ("container name already in use" / "No such container").
stale_names="$(docker ps -a --format '{{.Names}}' | grep -E '^[0-9a-f]+_hellolocal-' || true)"
if [ -n "$stale_names" ]; then
  echo "Removing stale compose recreate leftovers:"
  # shellcheck disable=SC2086
  echo "$stale_names" | xargs -r docker rm -f
fi

docker compose \
  --env-file /opt/hellolocal/stack.env \
  -f /opt/hellolocal/prod/deploy/docker-compose.yml \
  --project-directory /opt/hellolocal/prod \
  "${PROFILE_ARGS[@]}" \
  up -d --build --remove-orphans "${SERVICES[@]}"

# git checkout replaces the Caddyfile with a new inode. The running proxy
# keeps the previous file until the container is recreated.
if printf '%s\n' "${SERVICES[@]}" | grep -qx caddy; then
  docker compose \
    --env-file /opt/hellolocal/stack.env \
    -f /opt/hellolocal/prod/deploy/docker-compose.yml \
    --project-directory /opt/hellolocal/prod \
    up -d --force-recreate --no-deps caddy
fi
