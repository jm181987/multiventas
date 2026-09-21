FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --filter @multiventas/api... --frozen-lockfile=false

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/db packages/db
COPY apps/api apps/api
RUN pnpm --filter @multiventas/db prisma:generate
RUN pnpm --filter @multiventas/db build
RUN pnpm --filter @multiventas/api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=5 CMD wget --spider -q http://127.0.0.1:3001/api/health || exit 1
CMD ["sh", "-c", "pnpm --dir /app/packages/db prisma:deploy && node dist/main.js"]
