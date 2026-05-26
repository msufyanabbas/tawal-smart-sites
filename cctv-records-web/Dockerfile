# syntax=docker/dockerfile:1.6
# ─── Stage 1: build Vite bundle ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps from the lockfile for reproducibility.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source needed for the build.
COPY tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js index.html ./
COPY src ./src

# Vite inlines VITE_* env vars at build time, so we accept them as build args.
# Compose passes VITE_API_BASE_URL via build.args (see docker-compose.yml).
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Outputs to /app/dist.
RUN npm run build


# ─── Stage 2: serve with nginx ───────────────────────────────────────────────
FROM nginx:alpine AS runner

# Drop the default site config; ours handles SPA routing + the /api proxy.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the static bundle into the location nginx serves from.
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Container healthcheck — `wget --spider` quietly checks that nginx is responding.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://127.0.0.1/ || exit 1

# The official nginx image already sets a sensible CMD; keep it explicit for clarity.
CMD ["nginx", "-g", "daemon off;"]
