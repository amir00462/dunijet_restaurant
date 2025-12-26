# Use Node.js base image
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S danijet -u 1001

# Set working directory
WORKDIR /app

# Change ownership of working directory
RUN chown -R danijet:nodejs /app
USER danijet

# Copy package files first for better caching
COPY --chown=danijet:nodejs package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source files
COPY --chown=danijet:nodejs . .

# Create non-root user directory for temp files
RUN mkdir -p /tmp && chown -R danijet:nodejs /tmp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]

