# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy source
COPY . .

# Expose backend port (matches server.js PORT)
EXPOSE 3000

# Run the server
CMD ["npm", "start"]
