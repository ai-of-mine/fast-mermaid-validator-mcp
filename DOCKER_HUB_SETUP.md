# Docker Hub Setup & Distribution

## 📦 Sharing on Docker Hub

Your Docker image can be shared on Docker Hub at:
**https://hub.docker.com/r/gregoriomomm/fast-mermaid-validator-mcp**

### Prerequisites

1. **Start Docker Desktop**
   - Open Docker Desktop application
   - Wait for it to be fully running

2. **Login to Docker Hub**
   ```bash
   docker login
   # Enter your Docker Hub credentials
   ```

### Build & Push Image

#### Option 1: Automated Script (Recommended)
```bash
# Start Docker Desktop first, then:
./docker-build.sh
```

This script will:
- Check if Docker is running
- Build for current platform
- Ask if you want multi-arch (amd64/arm64)
- Push to Docker Hub

#### Option 2: Manual Build & Push

**Single Platform (faster):**
```bash
docker build -t gregoriomomm/fast-mermaid-validator-mcp:1.1.1 \
             -t gregoriomomm/fast-mermaid-validator-mcp:latest .

docker push gregoriomomm/fast-mermaid-validator-mcp:1.1.1
docker push gregoriomomm/fast-mermaid-validator-mcp:latest
```

**Multi-Platform (amd64 + arm64):**
```bash
# Create buildx builder (first time only)
docker buildx create --name multiarch-builder --use

# Build and push multi-arch
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t gregoriomomm/fast-mermaid-validator-mcp:1.1.1 \
  -t gregoriomomm/fast-mermaid-validator-mcp:latest \
  --push .
```

### Verify Image on Docker Hub

After pushing, verify at:
```
https://hub.docker.com/r/gregoriomomm/fast-mermaid-validator-mcp/tags
```

### Update Docker Hub Repository

1. Go to: https://hub.docker.com/r/gregoriomomm/fast-mermaid-validator-mcp
2. Click "Edit"
3. Update:
   - **Description**: Fast Mermaid Diagram Validator - MCP Server & REST API
   - **Full Description**: Copy from README.md
   - **Repository**: https://github.com/ai-of-mine/fast-mermaid-validator-mcp

### Security Badge

After pushing, the image will show:
- ✅ **CVE-2025-9230 Fixed** - libssl3 & libcrypto3 updated to >= 3.5.4-r0
- Multi-architecture support (amd64, arm64)
- Alpine-based for minimal size

### Usage for End Users

Once published on Docker Hub, users can pull and run:

```bash
# Pull latest
docker pull gregoriomomm/fast-mermaid-validator-mcp:latest

# Pull specific version
docker pull gregoriomomm/fast-mermaid-validator-mcp:1.1.1

# Run
docker run -p 8000:8000 gregoriomomm/fast-mermaid-validator-mcp:1.1.1

# Run with environment variables
docker run -p 8000:8000 \
  -e LOG_LEVEL=debug \
  -e PORT=8000 \
  gregoriomomm/fast-mermaid-validator-mcp:latest

# Run MCP HTTP server
docker run -p 8080:8080 \
  gregoriomomm/fast-mermaid-validator-mcp:latest \
  node src/server.js --mcp-http
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  mermaid-validator:
    image: gregoriomomm/fast-mermaid-validator-mcp:1.1.1
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
      - PORT=8000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8000/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
```

### Image Information

**Tags:**
- `latest` - Latest stable release
- `1.1.1` - Specific version with CVE-2025-9230 fix
- Future versions will follow semantic versioning

**Platforms:**
- linux/amd64
- linux/arm64

**Base Image:**
- node:20-alpine (with security updates)

**Size:**
- ~150MB compressed

**Security:**
- Non-root user (nodejs:nodejs, UID 1001)
- CVE-2025-9230 patched
- Minimal attack surface (Alpine)
- No development dependencies

### Quick Start Commands

```bash
# 1. Start Docker Desktop

# 2. Login to Docker Hub
docker login

# 3. Build and push
./docker-build.sh

# 4. Verify on Docker Hub
open https://hub.docker.com/r/gregoriomomm/fast-mermaid-validator-mcp

# 5. Test locally
docker run -p 8000:8000 gregoriomomm/fast-mermaid-validator-mcp:1.1.1

# 6. Test in browser
open http://localhost:8000/api/v1/health
```

### Troubleshooting

**Issue: Docker daemon not running**
```bash
# Solution: Start Docker Desktop application
# Wait for "Docker Desktop is running" in menu bar
```

**Issue: Login failed**
```bash
# Solution: Check credentials
docker login
# Or use access token
docker login -u gregoriomomm --password-stdin
```

**Issue: Multi-arch build fails**
```bash
# Solution: Ensure buildx is set up
docker buildx create --name multiarch-builder --use
docker buildx inspect --bootstrap
```

**Issue: Push denied**
```bash
# Solution: Verify you're logged in with correct account
docker logout
docker login
```
