# Build stage
FROM node:20-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM caddy:2-alpine as production-stage

WORKDIR /usr/share/caddy

# Copy the built app
COPY --from=build-stage /app/dist .

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
EXPOSE 443
