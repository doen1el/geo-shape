FROM node:22-alpine
WORKDIR /app
COPY ./build build/
COPY package*.json .
RUN npm ci --omit=dev
EXPOSE 3000
ENV NODE_ENV=production

COPY ./cron.sh /etc/periodic/15min/cron
RUN chmod +x /etc/periodic/15min/cron
RUN apk add curl
ENV PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090

CMD crond && node build