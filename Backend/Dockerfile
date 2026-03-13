# Backend Dockerfile
# node:20-slim is Debian Bookworm slim — required because opencv-python-headless
# PyPI wheels are built against glibc and do NOT run on Alpine (musl libc).
FROM node:20-slim

WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# System packages:
#   chromium + libs  — Puppeteer / PDF rendering
#   python3-venv     — isolated Python env for face-verify script
#   libglib2.0-0     — runtime dep for opencv-python-headless
#   libgomp1         — OpenMP support (numpy / OpenCV parallel ops)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libnss3 \
    libfreetype6 \
    libharfbuzz0b \
    ca-certificates \
    fonts-freefont-ttf \
    python3 \
    python3-venv \
    libglib2.0-0 \
    libgomp1 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

# Create an isolated Python virtual environment and install face-verify packages.
# Using a venv avoids PEP 668 "externally-managed" errors on Debian Bookworm.
COPY requirements.txt ./requirements.txt
RUN python3 -m venv /opt/face-verify-venv \
  && /opt/face-verify-venv/bin/pip install --no-cache-dir -r requirements.txt

# Tell the Node service which Python binary to use for face verification.
# This ENV is overridden at runtime by the value in docker-compose `environment:`,
# which takes precedence over any value in the .env file.
ENV PYTHON_BIN=/opt/face-verify-venv/bin/python3

# Install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --fund=false

# Copy source
COPY . .

# Expose backend port (matches server.js PORT)
EXPOSE 3000

# Run the server
CMD ["npm", "start"]
