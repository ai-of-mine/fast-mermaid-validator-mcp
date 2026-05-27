/**
 * Mermaid Validator MCP Server with HTTP Transport
 * HTTP-enabled MCP server for web-based integrations
 */

import { MermaidValidatorMCPServer } from './server.js';
import { HttpTransport, HttpTransportOptions } from './transports/http.js';
const logger = require('../../src/utils/logger');
const config = require('../../src/config/config');

export class MermaidValidatorHTTPServer extends MermaidValidatorMCPServer {
  protected httpTransport: HttpTransport | null = null;
  protected httpOptions: HttpTransportOptions;

  constructor(httpOptions?: Partial<HttpTransportOptions>) {
    super();

    this.httpOptions = {
      port: httpOptions?.port || parseInt(process.env.MCP_HTTP_PORT || '8080'),
      host: httpOptions?.host || process.env.MCP_HTTP_HOST || '0.0.0.0',
      // Stateless by default. Set MCP_STATEFUL=true to enable session IDs.
      stateful: httpOptions?.stateful ?? (process.env.MCP_STATEFUL === 'true'),
      cors: httpOptions?.cors || {
        origin: process.env.MCP_CORS_ORIGIN || '*',
        credentials: true
      }
    };
  }

  /**
   * Start the HTTP transport
   */
  async startHttp(): Promise<void> {
    this.httpTransport = new HttpTransport(this, this.httpOptions);

    logger.info('Starting Mermaid Validator MCP Server with Streamable HTTP transport', {
      serverName: 'mermaid-validator',
      transport: 'streamable-http',
      mode: this.httpOptions.stateful ? 'stateful' : 'stateless',
      port: this.httpOptions.port,
      host: this.httpOptions.host
    });

    await this.httpTransport.start();

    logger.info('Streamable HTTP MCP Server ready', {
      endpoints: {
        mcp: `http://${this.httpOptions.host}:${this.httpOptions.port}/mcp`,
        health: `http://${this.httpOptions.host}:${this.httpOptions.port}/health`,
        info: `http://${this.httpOptions.host}:${this.httpOptions.port}/info`
      }
    });
  }

  /**
   * Start both stdio and HTTP transports
   */
  async startBoth(): Promise<void> {
    // Start HTTP transport
    await this.startHttp();

    // Note: stdio transport would block, so we only start HTTP for now
    logger.info('MCP Server running with HTTP transport only');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down HTTP MCP server');

    if (this.httpTransport) {
      await this.httpTransport.stop();
    }

    await super.shutdown();
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      transport: 'streamable-http',
      mode: this.httpOptions.stateful ? 'stateful' : 'stateless',
      port: this.httpOptions.port,
      host: this.httpOptions.host,
      running: this.httpTransport !== null
    };
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new MermaidValidatorHTTPServer();

  process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.shutdown();
    process.exit(0);
  });

  const mode = process.env.MCP_MODE || 'http';

  if (mode === 'both') {
    server.startBoth().catch((error) => {
      logger.logError(error, { context: 'http-mcp-server-startup' });
      process.exit(1);
    });
  } else {
    server.startHttp().catch((error) => {
      logger.logError(error, { context: 'http-mcp-server-startup' });
      process.exit(1);
    });
  }
}

export default MermaidValidatorHTTPServer;