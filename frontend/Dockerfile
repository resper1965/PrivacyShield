# PIIDetector Frontend Dockerfile
FROM node:20-alpine AS builder

# Install dependencies for build
RUN apk add --no-cache git

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY index.html ./

# Install dependencies with audit fix
RUN npm ci && npm audit fix --force

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# Build for production
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /usr/share/nginx/html /var/cache/nginx /var/run /var/log/nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

EXPOSE 80

USER nodejs

CMD ["nginx", "-g", "daemon off;"]