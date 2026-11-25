FROM node:20-bookworm-slim AS build

WORKDIR /app

ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_PUBLIC_REGISTRATION_ENABLED
ARG VITE_LEGACY_PHONE_LOGIN_ENABLED

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_PUBLIC_REGISTRATION_ENABLED=$VITE_PUBLIC_REGISTRATION_ENABLED
ENV VITE_LEGACY_PHONE_LOGIN_ENABLED=$VITE_LEGACY_PHONE_LOGIN_ENABLED

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1/ || exit 1
