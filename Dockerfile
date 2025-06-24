# Multi-stage Dockerfile for N.Crisis PII Detection System
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --only=production
RUN cd frontend && npm ci --only=production

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Build backend (TypeScript compilation)
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S ncrisis -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=ncrisis:nodejs /app/build ./build
COPY --from=builder --chown=ncrisis:nodejs /app/frontend/dist ./dist
COPY --from=builder --chown=ncrisis:nodejs /app/node_modules ./node_modules

# Create necessary directories
RUN mkdir -p uploads logs tmp && \
    chown -R ncrisis:nodejs uploads logs tmp

# Switch to non-root user
USER ncrisis

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "build/src/server-simple.js"]