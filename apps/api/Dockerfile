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
RUN pnpm --filter @multiventas/api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages/db ./packages/db
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
