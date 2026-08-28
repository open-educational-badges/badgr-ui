FROM node:25-bookworm-slim AS build

WORKDIR /app

COPY . .

RUN npm ci

RUN npm run build:app
RUN npm run build:web-components:prod

# Serve Application using Nginx Server

FROM nginx:alpine

COPY .docker/etc/nginx.conf /etc/nginx/nginx.conf
COPY .docker/etc/site.conf /etc/nginx/sites-available/

RUN mkdir -p /etc/nginx/sites-enabled/\
    && ln -s /etc/nginx/sites-available/site.conf /etc/nginx/sites-enabled/

COPY --from=build /app/dist/ /usr/share/nginx/html

ENV TZ="Europe/Berlin"

EXPOSE 80
