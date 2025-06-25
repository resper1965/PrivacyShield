FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++ curl

# Copy package files
COPY package*.json ./

# Copy all source code
COPY . .

# Install backend dependencies with fallback
RUN npm install --omit=dev --no-audit --no-fund || npm install --no-audit --no-fund

# Build backend if possible
RUN npm run build || echo "Backend build failed - using source"

# Install frontend dependencies if frontend exists
RUN if [ -d "frontend" ]; then \
        cd frontend && \
        (npm install --omit=dev --no-audit --no-fund || npm install --no-audit --no-fund) && \
        (npm run build || echo "Frontend build failed - using dist"); \
    fi

# Create directories
RUN mkdir -p uploads logs tmp

# Create user
RUN addgroup -g 1001 -S nodejs && adduser -S ncrisis -u 1001
RUN chown -R ncrisis:nodejs /app
USER ncrisis

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Flexible start command with multiple fallbacks
CMD ["sh", "-c", "\
  if [ -f build/src/server-simple.js ]; then \
    node build/src/server-simple.js; \
  elif [ -f src/server-simple.ts ]; then \
    npx ts-node src/server-simple.ts; \
  elif [ -f src/server-simple.js ]; then \
    node src/server-simple.js; \
  else \
    npm start; \
  fi"]