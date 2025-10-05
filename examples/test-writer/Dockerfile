# Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./
COPY pnpm-lock.yaml* ./

# Install dependencies based on lock file
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install --frozen-lockfile; \
    else npm ci; fi

# Copy source code
COPY . .

# Build the application using TypeScript
RUN npm run build

# Production stage
FROM node:22-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./
COPY pnpm-lock.yaml* ./

# Install production dependencies only
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile --production; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install --frozen-lockfile --prod; \
    else npm ci --omit=dev; fi

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy .env file if it exists (dotenv will read it automatically)
COPY --chown=nodejs:nodejs .env* ./

# Switch to non-root user
USER nodejs

# Expose port (VoltAgent default)
EXPOSE 3141

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application (dotenv/config is already imported in the code)
CMD ["node", "dist/index.js"]