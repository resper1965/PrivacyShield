# PIIDetector Backend Dockerfile
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with audit fix
RUN npm ci --only=production && npm audit fix --force

# Copy source code
COPY src/ ./src/
COPY prisma/ ./prisma/

# Build TypeScript
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create directories with proper permissions
RUN mkdir -p /uploads /tmp && \
    chown -R nodejs:nodejs /app /uploads /tmp

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

# Start application
CMD ["npm", "start"]