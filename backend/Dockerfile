FROM oven/bun:1.2.2

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libvips-dev \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
COPY packages ./packages

RUN bun install --frozen-lockfile --production

RUN bun add sharp --platform=linux --arch=x64

COPY . .

EXPOSE 3000

RUN bun run build

ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=$GIT_COMMIT
ENV NODE_ENV=production
ENV PORT=3000

CMD ["bun", "run", "start"]
