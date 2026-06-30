ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile


FROM base AS development
ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]


FROM deps AS build
COPY . .
RUN pnpm build

FROM base AS production
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
