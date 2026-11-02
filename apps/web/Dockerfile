# HelloLocal Web Dockerfile
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm@10.27.0

# Build stage
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Shared package + web source
COPY packages/shared ./packages/shared
RUN pnpm -C packages/shared build
COPY apps/web ./apps/web

# Build application
WORKDIR /app/apps/web
RUN pnpm run build

# Production stage with nginx
FROM nginx:alpine AS runtime

# Copy custom nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

