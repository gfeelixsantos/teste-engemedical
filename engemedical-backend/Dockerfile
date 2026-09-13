# ---------------------
# STAGE 1: Dependencies
# ---------------------
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile


# ---------------------
# STAGE 2: Build
# ---------------------
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

COPY . .

RUN pnpm run build


# ---------------------
# STAGE 3: Production
# ---------------------
FROM node:20-alpine AS prod

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3333

# Copiamos somente o minimo necessario
COPY --from=build /app/dist ./dist
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src/google/drive/googleDriveApi.json ./googleDriveApi.json

# Se voce usa assets do Nest (como emails / views / uploads)
COPY --from=build /app/public ./public
# COPY --from=build /app/prisma ./prisma

# Cria pastas necessarias
RUN mkdir -p /app/temp/audio && \
    mkdir -p /app/temp/audiometria

# Usuario seguro
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nestjs -u 1001 \
    && chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3333

CMD ["node", "dist/main"]
