# syntax=docker/dockerfile:1.6
# ─── Stage 1: build ──────────────────────────────────────────────────────────
# Compile TypeScript -> dist/ using the full devDependencies.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first so Docker can cache the dependency layer across rebuilds.
COPY package.json package-lock.json ./

# `npm ci` requires package-lock.json and gives reproducible installs.
RUN npm ci

# Now copy the rest of the source and produce dist/.
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN npm run build


# ─── Stage 2: production runtime ─────────────────────────────────────────────
# Slim image with only production deps + the compiled output.
FROM node:20-alpine AS runner

# Tini is a tiny init that handles PID 1 signal forwarding cleanly,
# so SIGTERM from `docker stop` reaches Node instead of being swallowed.
RUN apk add --no-cache tini

ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies only.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Bring in the compiled output from the build stage.
COPY --from=builder /app/dist ./dist

# Run as the unprivileged "node" user that the official image ships with.
USER node

# Application binds to 3000 (hardcoded in src/main.ts).
EXPOSE 3000

# Lightweight healthcheck — hits the public /auth/login route and treats any
# HTTP response (even 400/404) as "Nest is up". A connection refused = unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/auth/login',r=>process.exit(r.statusCode?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
