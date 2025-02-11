FROM denoland/deno:2.1.9

RUN apt-get update && apt-get install -y cron

WORKDIR /app
COPY deno.lock .
COPY package.json .
RUN deno install

COPY ./cron.sh /etc/periodic/2hour/cron
RUN chmod +x /etc/periodic/2hour/cron
ENV PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090

COPY . .
ENV NODE_ENV=production
EXPOSE 3000

RUN deno task build

CMD cron && deno run --allow-env --allow-read --allow-net build/index.js