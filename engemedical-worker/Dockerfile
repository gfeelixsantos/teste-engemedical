# ==============================
# 🏗️ Build
# ==============================
FROM node:22-bookworm-slim AS builder

WORKDIR /usr/src/app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build


# ==============================
# 🚀 Runtime (API)
# ==============================
FROM node:22-bookworm-slim

WORKDIR /usr/src/app

# TLS para SMTP
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo

EXPOSE 3334

CMD ["node", "dist/main.js"]