# Best Single-Stage Dockerfile
# Avoids multi-stage cross-platform execution issues
# Based on working v1.0.1-amd64 approach

FROM node:22-alpine

# Update packages to fix CVE-2025-9230 (libssl3, libcrypto3)
RUN apk update && \
    apk upgrade --no-cache libssl3 libcrypto3 && \
    rm -rf /var/cache/apk/*

# Single RUN for user creation (minimize QEMU calls)
RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./

# Install dependencies (skip problematic packages)
RUN npm ci --omit=dev --no-audit --no-fund --ignore-scripts && \
    npm cache clean --force && \
    rm -rf ~/.npm

# Copy all application files with correct structure
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs scripts/ ./scripts/

# Verify file structure is correct
RUN ls -la /app/src/server.js && echo "✅ server.js found in correct location"

# Final setup in single RUN (minimize cross-platform issues)
RUN mkdir -p tmp logs && \
    chown -R nodejs:nodejs /app && \
    find /app -type f -name "*.md" -delete && \
    find /app -type f -exec chmod 644 {} \; && \
    find /app -type d -exec chmod 755 {} \; && \
    chmod 755 /app/src/server.js

# Switch to non-root user
USER nodejs

# Environment
ENV NODE_ENV=production \
    PORT=8000 \
    LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8000/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Expose port and start
EXPOSE 8000
CMD ["node", "src/server.js"]

# Labels
LABEL name="fast-mermaid-validator-mcp" \
      version="1.1.1" \
      description="Fast Mermaid Validator MCP - LLM Integration Ready - CVE-2025-9230 Fixed"