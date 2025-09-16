
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm install
COPY server/ ./

FROM node:20-alpine
RUN apk add --no-cache nginx
WORKDIR /app
COPY --from=server-builder /app/server ./server
COPY --from=client-builder /app/client/dist ./client/dist
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
CMD sh -c "nginx -g 'daemon off;' & cd /app/server && npm start"