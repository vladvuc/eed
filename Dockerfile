# GDP Statistika: one Node process serving the API and the built React app.
# Node ≥ 22.18 runs the TypeScript server directly (type stripping), so there is no server build step.

FROM node:24-slim AS build
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Optional: overrides the public URL baked into canonical links, og:image, sitemap.xml and robots.txt
# (default https://eed.sveska.dev, see src/data/seo.ts). Dokploy: Build-time Arguments.
ARG SITE_URL
ENV SITE_URL=$SITE_URL
# PostHog project token (public; analytics are off without it). Baked into the client here and
# passed on to the server below, so Dokploy needs it once, as a Build-time Argument.
ARG POSTHOG_PROJECT_TOKEN
ENV VITE_POSTHOG_PROJECT_TOKEN=$POSTHOG_PROJECT_TOKEN
RUN pnpm build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    CACHE_DIR=/app/data \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
ARG POSTHOG_PROJECT_TOKEN
ENV POSTHOG_PROJECT_TOKEN=$POSTHOG_PROJECT_TOKEN
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && pnpm store prune
COPY --from=build /app/dist ./dist
COPY server ./server
# Downloaded datasets are cached here for 24 h; mount a volume on /app/data to keep them across redeploys.
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "server/index.ts"]
