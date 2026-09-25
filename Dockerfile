# VOID // AGENT LAB — production image for /voidagentlab/
# Build stage: Vite production build with npm ci + npm run build (existing project commands)
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig*.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

# Serve stage: nginx serving dist under /voidagentlab/ (path preserved end-to-end)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html/voidagentlab
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
