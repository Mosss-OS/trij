FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .

FROM base AS dev
EXPOSE 5173
CMD ["bun", "run", "dev"]

FROM base AS build
RUN bun run build

FROM node:22-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
RUN npm install --production
EXPOSE 3000
CMD ["node", "dist/server/index.js"]
