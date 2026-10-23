FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public ./public
COPY src ./src
ARG VITE_API_URL=http://localhost:4000
ARG VITE_APP_BASE_DOMAIN=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_BASE_DOMAIN=$VITE_APP_BASE_DOMAIN
# Skip `tsc -b` in Docker (heap-heavy); Vite build is enough for the image.
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npx vite build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
