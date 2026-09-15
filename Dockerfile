# ==============================================================================
# Multi-stage Dockerfile for MCServer Manager (Production Grade)
# Provides Node.js 22 LTS, OpenJDK 21, and Playit.gg tunnel in a single container
# Compatible with Dokploy, Cloudflare Tunnels, and Docker Compose
# ==============================================================================

# Stage 1: Build the React + Vite Frontend
FROM node:22-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# Stage 2: Build the TypeScript Backend
FROM node:22-alpine AS server-builder
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npm run build

# Stage 3: Production Runtime
FROM eclipse-temurin:21-jre AS runner

# Install dependencies, Node.js 22, and Playit.gg CLI
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    procps \
    bash \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y nodejs \
    && curl -SsL https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-linux-amd64 -o /usr/local/bin/playit \
    && chmod +x /usr/local/bin/playit \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production dependencies for server
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy compiled backend and frontend
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=client-builder /app/client/dist ./client/dist

# Default persistent server root directory
ENV PORT=3000 \
    NODE_ENV=production \
    SERVER_ROOT=/data \
    PANEL_CONFIG_PATH=/data/panel-config.json

RUN mkdir -p /data

EXPOSE 3000

VOLUME ["/data"]

CMD ["node", "server/dist/index.js"]
