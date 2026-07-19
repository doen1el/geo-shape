# builder
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# runner
FROM node:24-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    GEOSHAPE_DB=/data/geoshape.db

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

COPY --from=builder /app/build ./build
COPY server ./server
COPY server.js ./server.js

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
