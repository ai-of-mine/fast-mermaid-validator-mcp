# Alpine variant. Default ENTRYPOINT is the Streamable HTTP MCP server
# (stateless, MCP-spec-compliant, on port 8080). Override CMD to fall back
# to the REST API on port 8000 — see the README.

FROM node:22-alpine

# Update packages to fix CVE-2025-9230 (libssl3, libcrypto3)
RUN apk update && \
    apk upgrade --no-cache libssl3 libcrypto3 && \
    rm -rf /var/cache/apk/*

RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D nodejs

WORKDIR /app

# Copy package manifest first for layer caching
COPY --chown=nodejs:nodejs package*.json ./

# Production deps only. Build scripts skipped — generated artefacts are
# committed under src/generated/jison + dist/mcp.
RUN npm ci --omit=dev --no-audit --no-fund --ignore-scripts && \
    npm cache clean --force && \
    rm -rf ~/.npm

# App code + pre-compiled MCP TypeScript output (dist/mcp must be built
# locally with `npm run build:mcp` before `docker build`).
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs scripts/ ./scripts/
COPY --chown=nodejs:nodejs dist/ ./dist/

RUN test -f /app/src/server.js && \
    test -f /app/dist/mcp/server-http.js && \
    echo "OK: REST entry + MCP-HTTP entry both present"

RUN mkdir -p tmp logs && \
    chown -R nodejs:nodejs /app && \
    find /app -type f -name "*.md" -delete && \
    find /app -type f -exec chmod 644 {} \; && \
    find /app -type d -exec chmod 755 {} \; && \
    chmod 755 /app/src/server.js /app/dist/mcp/server-http.js

USER nodejs

ENV NODE_ENV=production \
    LOG_LEVEL=info \
    MCP_HTTP_PORT=8080 \
    MCP_HTTP_HOST=0.0.0.0 \
    PORT=8000

# Health check hits the MCP server's /health endpoint (port 8080).
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 8080 = Streamable HTTP MCP. 8000 = REST API (when explicitly started).
EXPOSE 8080 8000

# Default: stateless Streamable HTTP MCP server.
# To run the REST API instead:  podman run ... <image> node src/server.js
CMD ["node", "dist/mcp/server-http.js"]

LABEL name="fast-mermaid-validator-mcp" \
      version="1.3.1" \
      description="Fast Mermaid Validator MCP — default Streamable HTTP MCP transport (stateless)"
