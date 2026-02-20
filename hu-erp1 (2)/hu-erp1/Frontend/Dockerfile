# Frontend Dockerfile (Vite React)
# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Production stage - serve with a lightweight static server
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Expose frontend port
EXPOSE 80

# Default nginx start command
CMD ["nginx", "-g", "daemon off;"]
