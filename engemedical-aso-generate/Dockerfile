# Estágio 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Instala apenas as dependências e constrói o TypeScript
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# Estágio 2: Produção Prontificada para Puppeteer
FROM node:20-slim

# Instalação das dependências fundamentais de SO (Debian) para renderização do Chromium/Puppeteer.
# Utiliza pacotes otimizados com fontes inclusas para geração perfeita de PDFs.
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Variável para sinalizar o Puppeteer a usar o Chrome de SO já pré-instalado e skipar download nativo
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

COPY package*.json ./

# Instala somente os módulos de produção
RUN npm ci --omit=dev

# Copia a pasta de transpilação do estágio anterior
COPY --from=builder /app/dist ./dist

# Certifica-se de que a pasta local temp será writable
RUN mkdir -p temp && chmod 777 temp

# Comando principal de inicialização da worker
CMD ["node", "dist/worker.js"]
