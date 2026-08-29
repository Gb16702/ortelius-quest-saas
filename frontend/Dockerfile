FROM oven/bun:1.3 AS base
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_PORTAL_ACCOUNT_URL
ARG AUTH_URL
ARG API_URL
ARG WS_URL
ARG LOGIN_URL
ARG VITE_UMAMI_URL
ARG VITE_UMAMI_WEBSITE_ID
ARG VITE_GMAPS_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_PORTAL_ACCOUNT_URL=$VITE_PORTAL_ACCOUNT_URL
ENV AUTH_URL=$AUTH_URL
ENV API_URL=$API_URL
ENV WS_URL=$WS_URL
ENV LOGIN_URL=$LOGIN_URL
ENV VITE_UMAMI_URL=$VITE_UMAMI_URL
ENV VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID
ENV VITE_GMAPS_KEY=$VITE_GMAPS_KEY
ENV NODE_ENV=production
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY packages/websocket-types/package.json /temp/dev/packages/websocket-types/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
COPY packages/websocket-types/package.json /temp/prod/packages/websocket-types/
RUN cd /temp/prod && bun install --frozen-lockfile --production

FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
RUN bun run build

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=build /usr/src/app/.output .output
COPY --from=build /usr/src/app/package.json .
USER bun
EXPOSE 3000
CMD ["bun", "run", "start"]
