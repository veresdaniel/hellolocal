#!/bin/bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Rootként futtasd: ssh root@135.181.157.111"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git openssl

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

mkdir -p /opt/hellolocal /root/.ssh
chmod 700 /root/.ssh

if [ ! -f /opt/hellolocal/stack.env ]; then
  umask 077
  cat > /opt/hellolocal/stack.env <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET_PROD=$(openssl rand -hex 32)
JWT_SECRET_DEVEL=$(openssl rand -hex 32)
PROD_SRC=/opt/hellolocal/prod
DEVEL_SRC=/opt/hellolocal/devel
EOF
  umask 022
fi

KEY=/root/.ssh/hellolocal_deploy
if [ ! -f "$KEY" ]; then
  ssh-keygen -t ed25519 -f "$KEY" -N "" -C "hellolocal-deploy"
  cat "$KEY.pub" >> /root/.ssh/authorized_keys
  chmod 600 /root/.ssh/authorized_keys "$KEY"
fi

if [ ! -d /opt/hellolocal/prod/.git ]; then
  git clone --branch main https://github.com/veresdaniel/hellolocal.git /opt/hellolocal/prod
fi

if [ ! -f /opt/hellolocal/prod/deploy/remote-deploy.sh ]; then
  echo "A main ágon még nincs meg a deploy könyvtár. Pushold ki a változásokat, majd futtasd újra ezt a szkriptet."
  exit 1
fi

BRANCH=main bash /opt/hellolocal/prod/deploy/remote-deploy.sh

echo
echo "A szerver elkészült. A GitHub secret neve: HETZNER_SSH_KEY"
echo "Ezt a privát kulcsot csak a GitHub secret mezőbe másold, chatbe ne küldd:"
echo
cat "$KEY"
