# --- build ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/database/migrations ./src/database/migrations

RUN mkdir -p uploads

EXPOSE 3000

CMD ["sh", "-c", "npm run db:migrate && node dist/main"]
