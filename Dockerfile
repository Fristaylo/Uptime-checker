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
RUN apk add --no-cache nginx postgresql
WORKDIR /app
COPY --from=server-builder /app/server ./server
COPY --from=client-builder /app/client/dist ./client/dist
COPY nginx.conf /etc/nginx/nginx.conf
COPY init-db.sh /docker-entrypoint-initdb.d/init-db.sh
COPY start.sh /start.sh
RUN chmod +x /start.sh /docker-entrypoint-initdb.d/init-db.sh

# PostgreSQL setup
RUN mkdir -p /var/lib/postgresql/data && chown -R postgres:postgres /var/lib/postgresql/data
USER postgres
RUN initdb -D /var/lib/postgresql/data
RUN echo "listen_addresses = '*'" >> /var/lib/postgresql/data/postgresql.conf
RUN echo "host all all 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf
USER root

CMD ["/start.sh"]

EXPOSE 5432