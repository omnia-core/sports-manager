FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# The service worker is what makes the app installable and usable courtside with
# no signal, so it ships enabled. docker-compose passes true to keep a stale
# worker out of local runs.
ARG VITE_DISABLE_SW=false
ENV VITE_DISABLE_SW=$VITE_DISABLE_SW
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Rendered by the nginx image's entrypoint at container start. The filter keeps
# envsubst away from nginx's own $host / $uri / $remote_addr variables.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV API_UPSTREAM=backend:8080
ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM
EXPOSE 80
