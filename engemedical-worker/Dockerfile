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

# TLS + Chrome para Puppeteer (PDF generation)
RUN apt-get update \
  && apt-get install -y wget gnupg \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | \
     gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
  && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] \
     http://dl.google.com/linux/chrome/deb/ stable main" | \
     tee /etc/apt/sources.list.d/google.list \
  && apt-get update \
  && apt-get install -y ca-certificates google-chrome-stable \
     fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg \
     fonts-kacst fonts-freefont-ttf libxss1 \
     --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

RUN corepack enable

COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo

EXPOSE 3334

CMD ["node", "dist/main.js"]
