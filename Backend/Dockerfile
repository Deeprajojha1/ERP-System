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
  ttf-freefont

# Install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy source
COPY . .

# Expose backend port (matches server.js PORT)
EXPOSE 3000

# Run the server
CMD ["npm", "start"]
