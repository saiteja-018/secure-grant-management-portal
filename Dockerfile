# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies (clean production & development for build)
RUN npm ci

# Copy all source files
COPY . .

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

# Install curl for reliable health checking
RUN apk add --no-cache curl

# Set production environment
ENV NODE_ENV=production

# Copy dependencies and application files from builder stage
COPY --from=builder /app /app

# Expose server port
EXPOSE 3000

# Health check configuration for the app container
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "src/server.js"]
