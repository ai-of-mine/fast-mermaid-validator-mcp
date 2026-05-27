#!/usr/bin/env node
/**
 * Main Server Application
 * Express.js server with comprehensive security and validation features
 */

const express = require('express');
const compression = require('compression');
const config = require('./config/config');
const logger = require('./utils/logger');
const FileProcessor = require('./services/fileProcessor');

// Import middleware
const {
  // rateLimitMiddleware, // DISABLED - delegated to API Gateway
  corsMiddleware,
  helmetMiddleware,
  errorHandler,
  requestLogger
} = require('./middleware/security');

// Import routes
const healthRoutes = require('./routes/health');
const validationRoutes = require('./routes/validation');
const markdownRoutes = require('./routes/markdown');
// const svgRoutes = require('./routes/svg'); // TODO: SVG routes file missing

class Server {
  constructor() {
    this.app = express();
    this.fileProcessor = new FileProcessor();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Configure middleware
   */
  setupMiddleware() {
    // Trust proxy (important for rate limiting and IP detection)
    this.app.set('trust proxy', 1);

    // Security middleware
    this.app.use(helmetMiddleware);
    this.app.use(corsMiddleware);
    // this.app.use(rateLimitMiddleware); // DISABLED - delegated to API Gateway

    // Compression
    this.app.use(compression());

    // Request logging
    this.app.use(requestLogger);

    // Body parsing
    this.app.use(express.json({ 
      limit: config.server.maxRequestSize,
      strict: true
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: config.server.maxRequestSize 
    }));

    // Ensure temp directory exists
    this.fileProcessor.startCleanupInterval();
  }

  /**
   * Configure routes
   */
  setupRoutes() {
    const apiPrefix = `/api/${config.server.apiVersion}`;

    // Health check routes
    this.app.use(`${apiPrefix}/health`, healthRoutes);

    // Validation routes
    this.app.use(apiPrefix, validationRoutes);

    // Markdown processing routes
    this.app.use(`${apiPrefix}/markdown`, markdownRoutes);

    // SVG conversion routes
    // this.app.use(apiPrefix, svgRoutes); // TODO: SVG routes file missing

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Mermaid Validator API',
        version: process.env.npm_package_version || '1.0.0',
        description: 'High-performance API for validating Mermaid diagrams',
        environment: config.server.env,
        endpoints: {
          health: `${apiPrefix}/health`,
          validate: `${apiPrefix}/validate`,
          upload: `${apiPrefix}/upload/file`,
          stats: `${apiPrefix}/validate/stats`,
          markdownFix: `${apiPrefix}/markdown/fix`,
          markdownValidate: `${apiPrefix}/markdown/validate`,
          convertToSvg: `${apiPrefix}/convert-to-svg`,
          svgStatus: `${apiPrefix}/svg-status`,
          examples: `${apiPrefix}/examples/complex-flowchart`
        },
        documentation: '/docs',
        timestamp: new Date().toISOString()
      });
    });

    // API documentation (if in development)
    if (config.server.env === 'development') {
      this.setupSwaggerDocs();
    }

    // 404 handler (Express 5: middleware without a path matches all)
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup Swagger documentation (development only)
   */
  setupSwaggerDocs() {
    try {
      const swaggerJsdoc = require('swagger-jsdoc');
      const swaggerUi = require('swagger-ui-express');

      const options = {
        definition: {
          openapi: '3.0.0',
          info: {
            title: 'Mermaid Validator API',
            version: '1.0.0',
            description: 'High-performance API for validating Mermaid diagrams',
            contact: {
              name: 'API Support',
              email: 'support@example.com'
            }
          },
          servers: [
            {
              url: `http://localhost:${config.server.port}/api/v1`,
              description: 'Development server'
            }
          ]
        },
        apis: ['./src/routes/*.js']
      };

      const specs = swaggerJsdoc(options);
      this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
      
      logger.info('Swagger documentation available at /docs');
    } catch (error) {
      logger.logError(error, { context: 'swagger_setup' });
    }
  }

  /**
   * Configure error handling
   */
  setupErrorHandling() {
    // Global error handler
    this.app.use(errorHandler);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.logError(error, { context: 'uncaught_exception' });
      this.gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.logError(new Error(`Unhandled Rejection: ${reason}`), { 
        context: 'unhandled_rejection',
        promise: promise.toString()
      });
      this.gracefulShutdown('unhandledRejection');
    });

    // Handle process termination signals
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, starting graceful shutdown');
      this.gracefulShutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, starting graceful shutdown');
      this.gracefulShutdown('SIGINT');
    });
  }

  /**
   * Start the server
   */
  async start() {
    try {
      // Create HTTP server
      this.server = this.app.listen(config.server.port, config.server.host, () => {
        logger.info('Server started successfully', {
          port: config.server.port,
          host: config.server.host,
          environment: config.server.env,
          processId: process.pid,
          nodeVersion: process.version,
          timestamp: new Date().toISOString()
        });
      });

      // Configure server timeouts and connection limits
      this.server.timeout = parseInt(process.env.SERVER_TIMEOUT, 10) || 30000; // 30 seconds
      this.server.keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT, 10) || 5000; // 5 seconds
      this.server.headersTimeout = parseInt(process.env.HEADERS_TIMEOUT, 10) || 6000; // 6 seconds (must be > keepAliveTimeout)

      // Set connection limits to prevent overload
      this.server.maxConnections = parseInt(process.env.MAX_CONNECTIONS, 10) || 1000;

      // Optimize connection handling
      this.server.maxHeadersCount = parseInt(process.env.MAX_HEADERS_COUNT, 10) || 2000;
      this.server.maxRequestsPerSocket = parseInt(process.env.MAX_REQUESTS_PER_SOCKET, 10) || 0; // 0 = no limit

      return this.server;
    } catch (error) {
      logger.logError(error, { context: 'server_startup' });
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  gracefulShutdown(signal) {
    logger.info(`Starting graceful shutdown due to ${signal}`);

    // Stop accepting new connections
    if (this.server) {
      this.server.close((error) => {
        if (error) {
          logger.logError(error, { context: 'server_close' });
        } else {
          logger.info('HTTP server closed');
        }

        // Cleanup resources
        this.cleanup()
          .then(() => {
            logger.info('Graceful shutdown completed');
            process.exit(0);
          })
          .catch((cleanupError) => {
            logger.logError(cleanupError, { context: 'cleanup' });
            process.exit(1);
          });
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000); // 10 seconds
    } else {
      process.exit(0);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      // Cleanup file processor
      if (this.fileProcessor) {
        await this.fileProcessor.cleanupTempFiles();
      }

      // Add other cleanup tasks here
      logger.info('Resource cleanup completed');
    } catch (error) {
      logger.logError(error, { context: 'resource_cleanup' });
      throw error;
    }
  }
}

// Startup banners — written via console.log/console.error rather than the
// winston logger so they print regardless of LOG_LEVEL (default is 'warn').
// HTTP variants → stdout; stdio variant → stderr (stdout is the MCP protocol
// channel and must not be polluted).
function bannerHttp(out, label, port, host) {
  const url = `http://${host}:${port}`;
  const lines = [
    '',
    `🤖  ${label}`,
    `    transport: streamable-http   mode: ${process.env.MCP_STATEFUL === 'true' ? 'stateful' : 'stateless'}`,
    '',
    `    /mcp     ${url}/mcp        (POST/GET/DELETE — JSON-RPC + SSE)`,
    `    /health  ${url}/health     (liveness)`,
    `    /info    ${url}/info       (server metadata)`,
    '',
    '    MCP client config (e.g. Claude Code .mcp.json):',
    '      {',
    '        "mcpServers": {',
    '          "mermaid-validator": {',
    '            "type": "http",',
    `            "url": "${url}/mcp"`,
    '          }',
    '        }',
    '      }',
    '',
    '    Verify (in another terminal):',
    `      curl -s ${url}/info`,
    `      curl -s -X POST ${url}/mcp \\`,
    "        -H 'Content-Type: application/json' \\",
    "        -H 'Accept: application/json, text/event-stream' \\",
    "        -d '{\"jsonrpc\":\"2.0\",\"method\":\"tools/list\",\"id\":1}'",
    '',
    '    Env vars: PORT, MCP_HTTP_PORT, MCP_HTTP_HOST, MCP_STATEFUL, LOG_LEVEL',
    '    Stop:     Ctrl-C',
    ''
  ];
  out.write(lines.join('\n'));
}
function bannerStdio(label) {
  const lines = [
    '',
    `🤖  ${label}`,
    '    transport: stdio',
    '    (stdout is the MCP protocol channel — banner is on stderr)',
    '',
    '    Claude Code / Desktop config:',
    '      {',
    '        "mcpServers": {',
    '          "mermaid-validator": {',
    '            "command": "npx",',
    '            "args": ["-y", "@ai-of-mine/fast-mermaid-validator-mcp", "--mcp-stdio"]',
    '          }',
    '        }',
    '      }',
    '',
    '    Stop: Ctrl-C',
    ''
  ];
  process.stderr.write(lines.join('\n'));
}
function bannerRest(port, host) {
  const url = `http://${host}:${port}`;
  const lines = [
    '',
    '🌐  Mermaid Validator REST API',
    '',
    `    Base URL: ${url}/api/v1`,
    `      POST  ${url}/api/v1/validate         (JSON body)`,
    `      POST  ${url}/api/v1/upload/file       (multipart upload)`,
    `      GET   ${url}/api/v1/health           (liveness)`,
    '',
    '    Env vars: PORT, HOST, LOG_LEVEL, NODE_ENV',
    '    Stop:     Ctrl-C',
    ''
  ];
  process.stdout.write(lines.join('\n'));
}

// Start server if this file is run directly
if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse port argument
  const portIndex = args.indexOf('--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    const port = parseInt(args[portIndex + 1], 10);
    if (!isNaN(port)) {
      // Set environment variable for MCP servers
      if (args.includes('--mcp-http') || args.includes('--mcp-secure')) {
        process.env.MCP_HTTP_PORT = port.toString();
      } else {
        // Set for REST API server
        process.env.PORT = port.toString();
      }
    }
  }

  // Check for MCP server flags. The compiled MCP modules guard their auto-start
  // behind `require.main === module`, so we can't `require()` them — we have
  // to instantiate the exported class directly and call its start method.
  if (args.includes('--mcp-http')) {
    const port = process.env.MCP_HTTP_PORT || '8080';
    const host = process.env.MCP_HTTP_HOST || '0.0.0.0';
    const HTTPServer = require('../dist/mcp/server-http.js').default
      || require('../dist/mcp/server-http.js').MermaidValidatorHTTPServer;
    const mcp = new HTTPServer();
    process.on('SIGINT', async () => { await mcp.shutdown(); process.exit(0); });
    process.on('SIGTERM', async () => { await mcp.shutdown(); process.exit(0); });
    mcp.startHttp().then(() => {
      bannerHttp(process.stdout, 'Mermaid Validator MCP — Streamable HTTP', port, host === '0.0.0.0' ? 'localhost' : host);
    }).catch((err) => { logger.logError(err, { context: 'cli-mcp-http' }); process.exit(1); });
  } else if (args.includes('--mcp-stdio')) {
    bannerStdio('Mermaid Validator MCP — stdio');
    const StdioServer = require('../dist/mcp/server.js').default
      || require('../dist/mcp/server.js').MermaidValidatorMCPServer;
    const mcp = new StdioServer();
    process.on('SIGINT', async () => { await mcp.shutdown(); process.exit(0); });
    process.on('SIGTERM', async () => { await mcp.shutdown(); process.exit(0); });
    mcp.startStdio().catch((err) => { logger.logError(err, { context: 'cli-mcp-stdio' }); process.exit(1); });
  } else if (args.includes('--mcp-secure')) {
    const port = process.env.MCP_HTTP_PORT || '8080';
    const host = process.env.MCP_HTTP_HOST || '0.0.0.0';
    const SecureServer = require('../dist/mcp/server-secure.js').default
      || require('../dist/mcp/server-secure.js').SecureMermaidValidatorMCPServer;
    const mcp = new SecureServer();
    process.on('SIGINT', async () => { await mcp.shutdown(); process.exit(0); });
    process.on('SIGTERM', async () => { await mcp.shutdown(); process.exit(0); });
    const starter = typeof mcp.start === 'function' ? mcp.start.bind(mcp) : mcp.startHttp.bind(mcp);
    starter().then(() => {
      bannerHttp(process.stdout, 'Mermaid Validator MCP — Secure Streamable HTTP', port, host === '0.0.0.0' ? 'localhost' : host);
    }).catch((err) => { logger.logError(err, { context: 'cli-mcp-secure' }); process.exit(1); });
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Mermaid Validator MCP - Multi-mode Server

Usage:
  npx @ai-of-mine/fast-mermaid-validator-mcp [options]

Options:
  (no args)         Start REST API server (default port: 8000)
  --mcp-http        Start MCP server with HTTP transport (default port: 8080)
  --mcp-stdio       Start MCP server with stdio transport
  --mcp-secure      Start MCP server with secure HTTP transport (default port: 8080)
  --port <number>   Specify custom port (works with all modes)
  --help, -h        Show this help message

Environment Variables:
  PORT              REST API server port (default: 8000)
  MCP_HTTP_PORT     MCP HTTP server port (default: 8080)
  MCP_HTTP_HOST     MCP HTTP server host (default: localhost)
  MCP_CORS_ORIGIN   CORS origin (default: *)
  LOG_LEVEL         Logging level (default: warn)

Examples:
  # Start REST API server on default port 8000
  npx @ai-of-mine/fast-mermaid-validator-mcp

  # Start REST API server on custom port
  npx @ai-of-mine/fast-mermaid-validator-mcp --port 3000

  # Start MCP HTTP server on default port 8080
  npx @ai-of-mine/fast-mermaid-validator-mcp --mcp-http

  # Start MCP HTTP server on custom port 9000
  npx @ai-of-mine/fast-mermaid-validator-mcp --mcp-http --port 9000

  # Use environment variable
  PORT=3000 npx @ai-of-mine/fast-mermaid-validator-mcp
  MCP_HTTP_PORT=9000 npx @ai-of-mine/fast-mermaid-validator-mcp --mcp-http

API Endpoints (REST mode):
  http://localhost:8000/api/v1/validate        - Validate diagrams (JSON)
  http://localhost:8000/api/v1/upload/file     - Upload files (multipart)
  http://localhost:8000/api/v1/health          - Health check

MCP Endpoint (--mcp-http mode):
  http://localhost:8080/mcp                    - MCP HTTP transport

Documentation:
  https://github.com/ai-of-mine/fast-mermaid-validator-mcp
`);
    process.exit(0);
  } else {
    // Default: Start REST API server
    const server = new Server();
    server.start().then(() => {
      const restPort = process.env.PORT || (config && config.server && config.server.port) || '8000';
      const restHost = process.env.HOST || (config && config.server && config.server.host) || '0.0.0.0';
      bannerRest(restPort, restHost === '0.0.0.0' ? 'localhost' : restHost);
    }).catch((error) => {
      logger.logError(error, { context: 'server_startup_error' });
      process.exit(1);
    });
  }
}

module.exports = Server;