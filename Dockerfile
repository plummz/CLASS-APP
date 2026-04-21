FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openjdk-17-jdk ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV JAVAC_BIN=javac
ENV JAVA_BIN=java
ENV CODE_LAB_JAVA_TIMEOUT_MS=5000

EXPOSE 3000

CMD ["node", "server.js"]
