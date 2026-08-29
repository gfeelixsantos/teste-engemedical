# ============================
# 🏗️ Etapa 1 - Build
# ============================
FROM node:22-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

# ============================
# 🚀 Etapa 2 - Runner (Muito mais leve)
# ============================
FROM node:22-alpine AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production
# O modo standalone precisa desse env para aceitar conexões externas
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copiamos apenas o que o Next.js separou como essencial
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/.next/standalone ./
COPY --from=builder /usr/src/app/.next/static ./.next/static

EXPOSE 3000

# Iniciamos diretamente com Node, sem depender do NPM
CMD ["node", "server.js"]