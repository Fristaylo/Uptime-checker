# Stage 1: Build the client
FROM node:18-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm install
COPY client/ ./
ARG VITE_GLOBALPING_API_KEY
ENV VITE_GLOBALPING_API_KEY=$VITE_GLOBALPING_API_KEY
RUN npm run build

# Stage 2: Build the server
FROM node:18-alpine AS server-builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm install
COPY server/ ./

# Stage 3: Final image
FROM node:18-alpine
RUN apk add --no-cache nginx
WORKDIR /app
COPY --from=server-builder /app/server ./server
COPY --from=client-builder /app/client/dist ./client/dist
COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]