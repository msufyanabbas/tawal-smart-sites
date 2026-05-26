# tawal-smart-sites

CCTV/site-records platform — NestJS backend + React (Vite) web frontend,
deployed as a two-container docker stack behind nginx.

## Project layout

| Path                       | What                                              |
| -------------------------- | ------------------------------------------------- |
| `cctv-backend-for-new/`    | NestJS API (Mongo, JWT, mail). Dockerfile inside. |
| `cctv-records-web/`        | React SPA built with Vite; nginx serves the dist. |
| `cctv-records-app-for-new/`| Mobile companion app.                             |
| `docker-compose.yml`       | Root compose file — `backend` + `web` services.   |
| `deploy.sh`                | Local orchestrator that ships a build to prod.    |

## Deployment

Production runs on a single Ubuntu VPS at **`3.142.74.95`** behind the
domain **<https://tawal.smart-life.sa>**. Deploys are kicked off from
your workstation; everything builds and restarts on the server.

### Prerequisites

- **SSH key**: `tawal-key.pem` placed at `~/Downloads/tawal-key.pem`
  with `chmod 600`. Authorized for `ubuntu@3.142.74.95`.
- **GitHub access**: the deploy clones from
  `https://github.com/msufyanabbas/tawal-smart-sites.git` over HTTPS,
  so the repo must be public or the server must have credentials cached
  (e.g. a deploy key in `~/.ssh/` and the URL swapped to SSH form).
- **Local env files** must exist before you run `deploy.sh`:
  - `cctv-backend-for-new/.env.prod` (preferred) — backend container env
    (Mongo URI, JWT secrets, SMTP creds, `NODE_ENV=production`, etc.).
    If absent, the script falls back to `cctv-backend-for-new/.env` and
    rewrites `NODE_ENV=production` on the fly.
  - Root `.env` — compose-level interpolation (`WEB_HTTP_PORT`, etc.).
    Uploaded to the server as `.env.compose` and passed via
    `docker compose --env-file .env.compose`.
- **Docker installed locally** is NOT required — the script only needs
  `bash`, `ssh`, and `scp`. All docker work happens on the server.

### First-time server setup

Run once on the VPS (`ssh -i ~/Downloads/tawal-key.pem ubuntu@3.142.74.95`):

```bash
# Install Docker Engine + the compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # then log out / back in
sudo systemctl enable --now docker

# Create the package directory the deploy script writes to
mkdir -p ~/tawal-package

# (Optional) set up nginx-reverse-proxy / TLS termination at the host
# level if you don't want the web container to expose port 80 directly.
```

### Run a deploy

From the repo root on your workstation:

```bash
bash deploy.sh
```

The script does:

1. `scp` the backend env file → `~/tawal-package/.env`
2. `scp` the root `.env` → `~/tawal-package/.env.compose`
3. `scp` `docker-compose.yml` → `~/tawal-package/docker-compose.yml`
4. `ssh` in and `git clone` the latest `master` into `/tmp/tawal-build`
5. `docker build -t tawal-backend:latest -f cctv-backend-for-new/Dockerfile .`
6. `docker build -t tawal-frontend:latest -f cctv-records-web/Dockerfile
   --build-arg VITE_API_BASE_URL=https://tawal.smart-life.sa .`
7. `docker compose --env-file .env.compose down && up -d`
8. Wait 25s for health checks, delete `/tmp/tawal-build`, print
   `docker compose ps` and the last 20 lines of each container's logs.

### Checking logs

```bash
ssh -i ~/Downloads/tawal-key.pem ubuntu@3.142.74.95
cd ~/tawal-package

# Follow both containers
docker compose --env-file .env.compose logs -f

# One service only
docker compose --env-file .env.compose logs -f backend
docker compose --env-file .env.compose logs -f web

# Inspect health
docker compose --env-file .env.compose ps
```

### Environment variables

Backend container env (in `cctv-backend-for-new/.env.prod`):

| Var                      | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| `MONGODB_URI`            | Mongo connection string.                      |
| `JWT_SECRET`             | Legacy single-secret JWT signer.              |
| `JWT_ACCESS_SECRET`      | Access-token signing secret.                  |
| `JWT_REFRESH_SECRET`     | Refresh-token signing secret.                 |
| `EMAIL_HOST`             | SMTP server hostname.                         |
| `EMAIL`                  | SMTP / "from" address.                        |
| `EMAIL_PASSWORD`         | SMTP password (app password for Gmail).       |
| `CLIENT_URL`             | Public frontend URL — used in email links.    |
| `CORS_ORIGINS`           | Comma-separated allowlist.                    |
| `NODE_ENV`               | Should be `production` in this file.          |

Compose-level interpolation (in root `.env`, uploaded as `.env.compose`):

| Var                  | Default | Purpose                                       |
| -------------------- | ------- | --------------------------------------------- |
| `WEB_HTTP_PORT`      | `80`    | Host port the `web` container binds to.       |
| `WEB_HTTPS_PORT`     | `443`   | Reserved for TLS once `nginx.conf` + certs.   |

Note: `VITE_API_BASE_URL` is **not** a runtime env var — Vite inlines it
at build time. The deploy script passes it as a `--build-arg` so the
SPA bundle ends up calling `https://tawal.smart-life.sa` directly.
