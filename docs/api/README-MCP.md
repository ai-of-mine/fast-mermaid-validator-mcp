# Mermaid Validator MCP Server

A comprehensive Model Context Protocol (MCP) server for validating Mermaid diagrams using grammar-based parsers. Supports 28+ Mermaid diagram types with multiple transport options and enterprise-grade performance.

## 🆕 Latest Updates
- ✅ **100% Environment Variable Configuration**: All limits now configurable
- ✅ **Unlimited Processing Mode**: Set limits to `-1` for unlimited processing
- ✅ **Enterprise Performance**: 500+ concurrent connections with nginx proxy
- ✅ **Zero-Error HPA Configuration**: Aggressive auto-scaling for production
- ✅ **Rate Limiting Delegation**: Removed from application, handled by API Gateway

## 🚀 Features

### Core Capabilities
- **28+ Mermaid Diagram Types**: Flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, Gantt charts, and more
- **Multiple Parser Engines**: Jison, ANTLR, and Langium grammar parsers
- **Grammar-Based Validation**: Real syntax validation, not just pattern matching
- **File Processing**: Markdown files and ZIP archives support
- **Stateless Architecture**: No persistent storage, process files in memory

### Transport Options
- **Stdio Transport**: For CLI tools and direct integrations
- **HTTP Transport**: RESTful API with streaming support
- **Server-Sent Events (SSE)**: Real-time streaming for large file processing

### Security Features
- **Rate Limiting**: Configurable request throttling
- **Authentication**: API key and Bearer token support
- **Input Validation**: Comprehensive request sanitization
- **Audit Logging**: Complete request/response tracking
- **Error Handling**: Secure error responses

## 📦 Installation

```bash
# Install dependencies
npm install

# Build the MCP server
npm run build:mcp
```

## 🏃 Quick Start

### Stdio Transport (Default)
```bash
# Start MCP server with stdio transport
npm run start:mcp
```

### HTTP Transport
```bash
# Start HTTP MCP server
npm run start:mcp-http

# Or with custom port
MCP_HTTP_PORT=8080 npm run start:mcp-http
```

### Secure Production Server
```bash
# Start secure server with authentication
NODE_ENV=production MCP_AUTH_ENABLED=true npm run start:mcp-secure
```

## 🔧 Configuration

### Environment Variables

#### Core MCP Configuration
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `MCP_HTTP_PORT` | HTTP server port | 8080 |
| `MCP_HTTP_HOST` | HTTP server host | localhost |
| `MCP_AUTH_ENABLED` | Enable authentication | false |
| `MCP_CORS_ORIGIN` | CORS allowed origins | * |
| `MCP_ENABLE_SSE` | Enable Server-Sent Events | true |

#### Configurable Limits
| Variable | Description | Default | Unlimited |
|----------|-------------|---------|--------|
| `MAX_FILE_SIZE` | Maximum file size in bytes | 104857600 (100MB) | -1 |
| `MAX_FILES` | Maximum number of files | 100000 | -1 |
| `MAX_DIAGRAM_CONTENT_LENGTH` | Max diagram content length | 1048576 (1MB) | -1 |
| `MERMAID_MAX_TEXT_SIZE` | Max Mermaid text size | 1048576 (1MB) | -1 |
| `MERMAID_MAX_EDGES` | Max edges per diagram | 10000 | -1 |
| `MERMAID_MAX_VERTICES` | Max vertices per diagram | 5000 | -1 |
| `MAX_TIMEOUT_MS` | Max validation timeout | 60000 | -1 |

💡 **Unlimited Mode**: Set any limit to `-1` to disable it completely for enterprise processing.

### Security Configuration

```typescript
const server = new SecureMermaidValidatorMCPServer({
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000,  // 15 minutes
      max: 100,                   // requests per window
    },
    authentication: {
      enabled: true,
      apiKeyHeader: 'x-mcp-api-key',
      bearerToken: true
    },
    audit: {
      enabled: true,
      logLevel: 'info'
    }
  }
});
```

## 🛠 MCP Tools

### 1. validate_mermaid
Validate Mermaid diagrams directly from content with comprehensive error reporting.

**Input Schema:**
```json
{
  "content": "graph TD; A-->B;",
  "type": "flowchart"
}
```

**Response Example:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "metadata": {
    "diagramType": "flowchart",
    "validationMethod": "jison_grammar",
    "contentLength": 15,
    "lineCount": 1,
    "processingTime": 2
  }
}
```

### 2. validate_file
Validate Mermaid diagrams from file contents (Markdown, ZIP) with base64 encoding support.

**Input Schema:**
```json
{
  "content": "<base64-encoded-file-content>",
  "filename": "example.md",
  "mimeType": "text/markdown"
}
```

**Response Example:**
```json
{
  "fileName": "example.md",
  "totalDiagrams": 2,
  "validDiagrams": 1,
  "invalidDiagrams": 1,
  "results": [
    {
      "diagramId": "diagram_1",
      "valid": true,
      "errors": [],
      "metadata": {
        "diagramType": "flowchart",
        "validationMethod": "jison_grammar"
      }
    }
  ]
}
```

### 3. get_examples
Get sample Mermaid diagrams for all supported diagram types.

**Input Schema:**
```json
{
  "diagramType": "flowchart"  // Optional: get examples for specific type
}
```

**Response Example:**
```json
{
  "examples": {
    "flowchart": {
      "content": "flowchart TD\n    A[Start] --> B[Process]\n    B --> C[End]",
      "description": "Basic flowchart with start, process, and end nodes"
    },
    "sequenceDiagram": {
      "content": "sequenceDiagram\n    Alice->>Bob: Hello\n    Bob->>Alice: Hi there",
      "description": "Simple sequence diagram between two participants"
    }
  }
}
```

## 📚 MCP Resources

### config://limits
Current validation limits and configuration (now fully configurable via environment variables).

### info://diagram-types
List of all 28+ supported Mermaid diagram types with parser information.

### examples://diagrams
Sample diagrams for all supported types for learning and testing.

## 🔍 Testing

### Test Stdio Transport
```bash
node test-mcp.js
```

### Test HTTP Transport
```bash
./test-http-mcp.sh
```

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:8080/health

# Test MCP initialization
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    },
    "id": 1
  }'

# Test validate_mermaid tool
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "validate_mermaid",
      "arguments": {
        "content": "flowchart TD\n    A --> B",
        "type": "flowchart"
      }
    },
    "id": 2
  }'

# Test get_examples tool
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_examples",
      "arguments": {}
    },
    "id": 3
  }'

# Test SSE streaming
curl http://localhost:8080/mcp/stream
```

## 📋 Supported Diagram Types

| Type | Parser | Status |
|------|--------|---------|
| flowchart | Jison | ✅ |
| graph | Jison | ✅ |
| sequenceDiagram | Jison | ✅ |
| classDiagram | Jison | ✅ |
| stateDiagram | Jison | ✅ |
| erDiagram | Jison | ✅ |
| gantt | Jison | ✅ |
| journey | Jison | ✅ |
| requirementDiagram | Jison | ✅ |
| sankey-beta | Jison | ✅ |
| xychart-beta | Jison | ✅ |
| kanban | Jison | ✅ |
| block | Jison | ✅ |
| c4 | Jison | ✅ |
| mindmap | Jison | ✅ |
| quadrant | Jison | ✅ |
| timeline | Jison | ✅ |
| packet | Langium | ✅ |
| architecture | Langium | ✅ |
| treemap | Langium | ✅ |

## 🏗 Architecture

```
src/mcp/
├── server.ts              # Core MCP server (stdio)
├── server-http.ts         # HTTP transport server
├── server-secure.ts       # Secure production server
├── tools/                 # MCP tool implementations
│   ├── validateDiagrams.ts
│   ├── validateFiles.ts
│   └── getStats.ts
├── transports/            # Transport implementations
│   └── http.ts
├── middleware/            # Security middleware
│   └── security.ts
└── schemas/               # Zod validation schemas
    └── common.ts
```

## 🔐 Security

### Security Compliance
- ✅ Comprehensive audit logging
- ✅ Input validation and sanitization
- ✅ Rate limiting and throttling
- ✅ Authentication and authorization
- ✅ Secure error handling
- ✅ CORS configuration
- ✅ Request/response monitoring

### Authentication Methods
1. **API Key**: `x-mcp-api-key` header
2. **Bearer Token**: `Authorization: Bearer <token>` header

### Rate Limiting
- **Development**: 1000 requests/15min
- **Production**: 100 requests/15min

## 🚀 Deployment

### Docker Support (Updated Node 20)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build:mcp
EXPOSE 8080
CMD ["npm", "run", "start:mcp-secure"]
```

### Environment Setup
```bash
# Production environment with unlimited processing
export NODE_ENV=production
export MCP_AUTH_ENABLED=true
export MCP_HTTP_PORT=8080
export MCP_CORS_ORIGIN=https://your-domain.com

# Enterprise unlimited configuration
export MAX_FILE_SIZE=-1              # Unlimited file size
export MAX_FILES=-1                  # Unlimited number of files
export MAX_DIAGRAM_CONTENT_LENGTH=-1 # Unlimited diagram size
export MERMAID_MAX_TEXT_SIZE=-1      # Unlimited text size
export MERMAID_MAX_EDGES=-1          # Unlimited edges
export MERMAID_MAX_VERTICES=-1       # Unlimited vertices

# Performance optimization
export SERVER_TIMEOUT=30000
export MAX_CONNECTIONS=1000
export KEEP_ALIVE_TIMEOUT=5000
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:8080/health
```

### Metrics Endpoint
```bash
curl http://localhost:8080/info
```

### Logs
All requests and responses are logged with:
- Request ID tracking
- Performance metrics
- Security events
- Error details

## 🤝 Integration

### Claude Desktop
Add to your Claude Desktop configuration:
```json
{
  "mcpServers": {
    "mermaid-validator": {
      "command": "node",
      "args": ["/path/to/dist/mcp/server.js"]
    }
  }
}
```

### HTTP Client Integration
```javascript
// Example client usage
const response = await fetch('http://localhost:8080/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'validate-diagrams',
      arguments: {
        diagrams: [{ content: 'graph TD; A-->B;' }]
      }
    },
    id: 1
  })
});
```

## 📄 License

Apache License 2.0 — see the [LICENSE](../../LICENSE) file for full text.

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Check the logs for detailed error information
- Use the health and info endpoints for diagnostics