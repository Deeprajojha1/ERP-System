# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Required packages for Puppeteer + Chromium on Alpine
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  python3 \
  make \
  g++

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --fund=false

# Copy source
COPY . .

# Expose backend port (matches server.js PORT)
EXPOSE 3000

# Run the server
CMD ["npm", "start"]
