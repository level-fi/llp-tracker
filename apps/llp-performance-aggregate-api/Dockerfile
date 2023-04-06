# TODO: Remove dev deps from prod build
# BUILDER - Stage 1
FROM node:16-alpine as builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN apk update && yarn global add turbo@1.8.1
COPY . .
RUN turbo prune --scope=llp-performance-aggregate-api --docker

# INSTALLER - Stage 2
FROM node:16-alpine as installer
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN apk update && apk add g++ make py3-pip && yarn global add pnpm

# First install dependencies (as they change less often)
COPY --from=builder /app/out/full/.gitignore ./.gitignore
COPY --from=builder /app/out/full/turbo.json ./turbo.json
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm fetch

# Build the project and its dependencies
COPY --from=builder /app/out/full/ .
RUN pnpm install -r --ignore-scripts
RUN pnpm turbo run build --filter=llp-performance-aggregate-api

# # RUNNER - Stage 3
FROM node:16-alpine AS runner
WORKDIR /app

# # Don't run production as root
RUN addgroup --system --gid 1001 app
RUN adduser --system --uid 1001 app
USER app
COPY --from=installer /app .

ENTRYPOINT ["node", "apps/llp-performance-aggregate-api/dist/main.js"]
