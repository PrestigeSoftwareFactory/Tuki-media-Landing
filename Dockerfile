# Imagen de producción de Tuki (Next.js + Prisma + PostgreSQL).
# La construye docker-compose.yml; los videos y archivos subidos van en el volumen /app/storage.
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# En producción la base es PostgreSQL
RUN node scripts/prisma-provider.mjs postgresql && npx prisma generate && npx next build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    STORAGE_DIR=/app/storage
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app ./
RUN mkdir -p /app/storage && chown -R node:node /app/storage
USER node
EXPOSE 3000
# Aplica el esquema a la base (sin borrar datos) y arranca
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx next start -p 3000"]
