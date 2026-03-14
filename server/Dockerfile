FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
COPY knexfile.ts ./

RUN npx tsc

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/knexfile.ts ./
COPY entrypoint.sh ./

# Remove .d.ts and .map files from migrations (knex tries to load .d.ts as code)
RUN rm -f dist/db/migrations/*.d.ts dist/db/migrations/*.d.ts.map dist/db/migrations/*.js.map
RUN chmod +x entrypoint.sh

# Run as non-root user (node:20-alpine provides uid 1000 'node' user)
USER node

EXPOSE 3105

CMD ["sh", "entrypoint.sh"]
