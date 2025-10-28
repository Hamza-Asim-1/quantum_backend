# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
# Use npm install if package-lock.json is not available, otherwise use npm ci
RUN if [ -f package-lock.json ]; then \
        npm ci --include=dev; \
    else \
        npm install; \
    fi

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
# Use npm install if package-lock.json is not available, otherwise use npm ci
RUN if [ -f package-lock.json ]; then \
        npm ci --omit=dev; \
    else \
        npm install --omit=dev; \
    fi && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy migration files (they are not compiled, just copied)
COPY --from=builder /app/src/database/migrations ./dist/database/migrations

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs /app

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application with automatic migrations
CMD ["sh", "-lc", "node dist/database/runMigrations.js && node dist/server.js"]