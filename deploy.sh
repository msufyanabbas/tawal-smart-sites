#!/bin/bash
set -e

# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — local orchestrator for tawal-smart-sites production deploys.
#
# Run from your workstation: bash deploy.sh
#
# Auth: password-based SSH via sshpass. You'll be prompted once at the start;
# the password is then exported as $SSHPASS and consumed by `sshpass -e`
# (which reads from the env var, so the password never appears on argv or
# in the process list).
#
# Flow:
#   Step 0  Upload local env files + docker-compose.yml to the server
#   Step 1  SSH in, clone the latest code from GitHub
#   Step 2  Build the backend docker image on the server
#   Step 3  Build the frontend docker image on the server
#   Step 4  Restart containers with docker compose
#   Step 5  Wait for the health check window
#   Step 6  Delete the cloned source tree
#   Step 7  Print container status + tail recent logs
# ─────────────────────────────────────────────────────────────────────────────

SERVER="root@147.79.114.76"
GITHUB_REPO="https://github.com/msufyanabbas/tawal-smart-sites.git"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
REMOTE_DIR="~/tawal-package"
FRONTEND_API_URL="https://tawal.smart-life.sa"

# StrictHostKeyChecking=no is intentional: with password auth and no pinned
# known_hosts entry, this avoids interactive host-key prompts on first
# connection or after server rebuilds. Tradeoff: no MITM protection. If you
# trust your network path, this is fine; otherwise run `ssh-keyscan` once
# and remove this line.
SSH_OPTS="-o PasswordAuthentication=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=20 \
  -o TCPKeepAlive=yes \
  -o ConnectTimeout=30 \
  -o StrictHostKeyChecking=no"

# Check sshpass is installed
if ! command -v sshpass &> /dev/null; then
  echo "❌ sshpass not installed. Run: brew install sshpass (mac) or apt install sshpass (linux) or use Git Bash on Windows"
  exit 1
fi

# Prompt once; export so `sshpass -e` (env-var mode) picks it up. Env-var
# mode is preferred over `-p` because `-p` puts the password on argv,
# visible to anyone who can read /proc on this machine.
read -s -p "🔑 Enter SSH password for $SERVER: " SSH_PASS
echo ""
export SSHPASS=$SSH_PASS

echo "🚀 Deploying tawal-smart-sites to production..."
echo "📡 Connecting to $SERVER..."

# ── Step 0: upload env files + docker-compose.yml ───────────────────────────
echo ""
echo "📤 Step 0: Uploading env files + docker-compose.yml to server..."

# Backend container env → ~/tawal-package/.env (consumed by `env_file:` in compose).
if [ -f "$ROOT_DIR/cctv-backend-for-new/.env.prod" ]; then
  echo "   Using cctv-backend-for-new/.env.prod for backend container env..."
  sshpass -e scp $SSH_OPTS \
    "$ROOT_DIR/cctv-backend-for-new/.env.prod" \
    "$SERVER:$REMOTE_DIR/.env"
elif [ -f "$ROOT_DIR/cctv-backend-for-new/.env" ]; then
  echo "   ⚠️  cctv-backend-for-new/.env.prod not found — using .env with NODE_ENV=production override..."
  sed 's/^NODE_ENV=.*/NODE_ENV=production/' \
    "$ROOT_DIR/cctv-backend-for-new/.env" > /tmp/tawal-prod.env
  # Append NODE_ENV if the source file didn't have a line to overwrite.
  grep -q '^NODE_ENV=' /tmp/tawal-prod.env || echo 'NODE_ENV=production' >> /tmp/tawal-prod.env
  sshpass -e scp $SSH_OPTS \
    /tmp/tawal-prod.env \
    "$SERVER:$REMOTE_DIR/.env"
  rm -f /tmp/tawal-prod.env
else
  echo "   ❌ No backend env file found at cctv-backend-for-new/.env[.prod]. Aborting."
  exit 1
fi

# Compose-level interpolation vars (WEB_HTTP_PORT, etc.) → ~/tawal-package/.env.compose.
# Loaded via `docker compose --env-file .env.compose`.
if [ -f "$ROOT_DIR/.env" ]; then
  sshpass -e scp $SSH_OPTS \
    "$ROOT_DIR/.env" \
    "$SERVER:$REMOTE_DIR/.env.compose"
  echo "   Uploaded root .env → .env.compose"
else
  echo "   ⚠️  Root .env not found — compose will use built-in defaults for \${...} vars."
fi

sshpass -e scp $SSH_OPTS \
  "$ROOT_DIR/docker-compose.yml" \
  "$SERVER:$REMOTE_DIR/docker-compose.yml"
echo "   ✅ Env files + docker-compose.yml uploaded"

# ── Steps 1-7: run remotely over SSH ────────────────────────────────────────
sshpass -e ssh $SSH_OPTS "$SERVER" bash << REMOTE
set -e

echo ""
echo "📥 Step 1: Cloning latest code from GitHub..."
cd /tmp
rm -rf tawal-build
git clone --depth=1 $GITHUB_REPO tawal-build
cd tawal-build
echo "✅ Code cloned — commit: \$(git log --oneline -1)"

echo ""
echo "🔨 Step 2: Building backend image..."
docker build \
  -t tawal-backend:latest \
  -f cctv-backend-for-new/Dockerfile \
  --quiet \
  cctv-backend-for-new
echo "✅ Backend image built"

echo ""
echo "🔨 Step 3: Building frontend image..."
docker build \
  -t tawal-frontend:latest \
  -f cctv-records-web/Dockerfile \
  --build-arg VITE_API_BASE_URL=$FRONTEND_API_URL \
  --quiet \
  cctv-records-web
echo "✅ Frontend image built (VITE_API_BASE_URL=$FRONTEND_API_URL)"

echo ""
echo "🔄 Step 4: Restarting containers..."
cd $REMOTE_DIR
# --env-file points compose at the interpolation file (.env.compose). The
# backend container env still comes from .env via env_file: in compose.
COMPOSE_ENV_ARG=""
if [ -f .env.compose ]; then
  COMPOSE_ENV_ARG="--env-file .env.compose"
fi
docker compose \$COMPOSE_ENV_ARG down
docker compose \$COMPOSE_ENV_ARG up -d
echo "✅ Containers started"

echo ""
echo "⏳ Step 5: Waiting 25s for health check..."
sleep 25

echo ""
echo "🧹 Step 6: Deleting cloned source..."
rm -rf /tmp/tawal-build
echo "✅ Source code deleted"

echo ""
echo "📊 Step 7: Container status:"
docker compose \$COMPOSE_ENV_ARG ps

echo ""
echo "📜 Recent backend logs (last 20 lines):"
docker compose \$COMPOSE_ENV_ARG logs --tail=20 backend || true

echo ""
echo "📜 Recent web logs (last 20 lines):"
docker compose \$COMPOSE_ENV_ARG logs --tail=20 web || true

echo ""
echo "🎉 Deployment complete!"
echo "🌐 https://tawal.smart-life.sa"
REMOTE
