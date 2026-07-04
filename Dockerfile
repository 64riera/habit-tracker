# syntax=docker/dockerfile:1

# ---- build stage: instala todas las deps y compila la app ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner stage: solo deps de producción + build ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# npm ci corre aquí (no se copia node_modules del builder) para que las
# dependencias nativas de @libsql/client se resuelvan para linux/musl,
# no para el SO donde se construyó la imagen.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/drizzle ./drizzle
COPY scripts/docker-migrate.mjs ./scripts/docker-migrate.mjs
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh \
  && mkdir -p /app/data \
  && addgroup -S nodejs \
  && adduser -S nextjs -G nodejs \
  && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
