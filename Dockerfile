FROM node:24.22.3-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY app ./app
COPY lib ./lib
COPY config ./config
COPY public ./public
COPY scripts ./scripts
COPY next.config.mjs ./
RUN pnpm run build

FROM node:24.22.3-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 TZ=Asia/Jakarta
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/package.json /app/next.config.mjs ./
COPY --from=build --chown=node:node /app/lib ./lib
COPY --from=build --chown=node:node /app/config ./config
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/scripts ./scripts
RUN mkdir -p /var/lib/benefits-expenses/data /var/lib/benefits-expenses/data-test /backups /app/.next/cache && chown -R node:node /var/lib/benefits-expenses /backups /app/.next/cache
USER node
EXPOSE 3100 3101
CMD ["node","scripts/serve.mjs"]
