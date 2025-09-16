FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY client/ ./client
COPY server/ ./server

RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache nginx
WORKDIR /app

COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .

COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf

CMD sh -c "nginx -g 'daemon off;' & npm run start:server"