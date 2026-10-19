# --- Build stage ---
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# "Today" (default date of the daily reports) is the nursery's local day, not UTC.
ENV TZ=Europe/Paris

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
# Migrations and seed, run with `docker compose run --rm backend npm run db:migrate`
COPY database ./database

EXPOSE 3000
CMD ["node", "dist/main.js"]
