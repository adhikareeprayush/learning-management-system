# Production image: `next start`, plus the Prisma CLI and tsx so the entrypoint
# can apply migrations and optionally seed / bootstrap an admin.

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    COREPACK_HOME=/opt/corepack
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# Same pnpm as package.json#packageManager, cached where the non-root user can read it.
RUN corepack enable \
  && corepack prepare pnpm@10.12.1 --activate \
  && chmod -R a+rX /opt/corepack

FROM base AS deps
# postinstall runs `prisma generate`, so the schema and config come first.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml schema.prisma prisma.config.ts ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle, and the ImageKit
# origin is baked into the CSP headers, so they must be known at build time.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3005
ARG NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=
ARG IMAGEKIT_URL_ENDPOINT=
ARG NEXT_PUBLIC_DEMO_MODE=false
ARG NODE_OPTIONS=--max-old-space-size=4096
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=$NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT \
    IMAGEKIT_URL_ENDPOINT=$IMAGEKIT_URL_ENDPOINT \
    NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE
# Scoped to this RUN only: without it better-auth logs a "default secret" error
# for every page while collecting page data. Nothing is signed at build time.
RUN BETTER_AUTH_SECRET=build-only-placeholder-never-used-at-runtime \
    pnpm build && rm -rf .next/cache

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3005
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder /app/public ./public
# Runtime files: fonts for certificate/receipt PDFs and the OG image, Prisma
# schema + migrations, and the seed / admin scripts (they import src/lib via tsx).
COPY --from=builder /app/package.json /app/next.config.ts /app/tsconfig.json \
     /app/schema.prisma /app/prisma.config.ts /app/seed.ts ./
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/seed ./seed
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh

USER node
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3005)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node_modules/.bin/next", "start"]
