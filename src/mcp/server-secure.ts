/**
 * Secure Mermaid Validator MCP Server
 * Production-ready MCP server with comprehensive security features
 */

import { MermaidValidatorHTTPServer } from './server-http.js';
import { MCPSecurityMiddleware, SecurityOptions } from './middleware/security.js';
import { HttpTransport } from './transports/http.js';
const logger = require('../../src/utils/logger');

export interface SecureMCPOptions {
  http?: {
    port?: number;
    host?: string;
    stateful?: boolean;
  };
  security?: SecurityOptions;
  environment?: 'development' | 'production';
}

export class SecureMermaidValidatorMCPServer extends MermaidValidatorHTTPServer {
  private securityMiddleware: MCPSecurityMiddleware;
  private secureOptions: SecureMCPOptions;

  constructor(options: SecureMCPOptions = {}) {
    const httpOptions = {
      port: options.http?.port || parseInt(process.env.MCP_HTTP_PORT || '8080'),
      host: options.http?.host || process.env.MCP_HTTP_HOST || '0.0.0.0',
      stateful: options.http?.stateful ?? (process.env.MCP_STATEFUL === 'true'),
      cors: {
        origin: process.env.MCP_CORS_ORIGIN?.split(',') || '*',
        credentials: true
      }
    };

    super(httpOptions);

    this.secureOptions = {
      environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
      ...options
    };

    // Configure security based on environment
    const securityConfig: SecurityOptions = {
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: this.secureOptions.environment === 'production' ? 100 : 1000, // stricter in prod
        message: 'Too many MCP requests, please try again later'
      },
      authentication: {
        enabled: this.secureOptions.environment === 'production' ||
                 process.env.MCP_AUTH_ENABLED === 'true',
        apiKeyHeader: 'x-mcp-api-key',
        bearerToken: true
      },
      audit: {
        enabled: true,
        logLevel: this.secureOptions.environment === 'production' ? 'info' : 'debug'
      },
      validation: {
        maxRequestSize: '10mb',
        sanitizeInput: true
      },
      ...options.security
    };

    this.securityMiddleware = new MCPSecurityMiddleware(securityConfig);
  }

  /**
   * Start secure HTTP transport with security middleware
   */
  async startSecure(): Promise<void> {
    logger.info('Starting Secure Mermaid Validator MCP Server', {
      environment: this.secureOptions.environment,
      authEnabled: this.securityMiddleware.options?.authentication?.enabled,
      auditEnabled: this.securityMiddleware.options?.audit?.enabled,
      port: this.httpOptions.port,
      host: this.httpOptions.host
    });

    // Apply security middleware to HTTP transport
    await this.setupSecureTransport();

    await this.startHttp();

    logger.info('Secure MCP Server ready with security features', {
      endpoints: {
        mcp: `http://${this.httpOptions.host}:${this.httpOptions.port}/mcp`,
        health: `http://${this.httpOptions.host}:${this.httpOptions.port}/health`,
        info: `http://${this.httpOptions.host}:${this.httpOptions.port}/info`
      },
      security: {
        authentication: this.securityMiddleware.options?.authentication?.enabled,
        rateLimit: this.securityMiddleware.options?.rateLimit?.max,
        audit: this.securityMiddleware.options?.audit?.enabled,
        inputSanitization: this.securityMiddleware.options?.validation?.sanitizeInput
      }
    });
  }

  /**
   * Setup secure HTTP transport with security middleware
   */
  private async setupSecureTransport(): Promise<void> {
    if (!this.httpTransport) {
      this.httpTransport = new HttpTransport(this, this.httpOptions);
    }

    // Get the Express app from the transport and apply security middleware
    const app = (this.httpTransport as any).app;

    if (app) {
      // Apply security middleware in correct order
      app.use(this.securityMiddleware.getResponseMiddleware());
      app.use(this.securityMiddleware.getRateLimitMiddleware());
      app.use(this.securityMiddleware.getAuthMiddleware());
      app.use(this.securityMiddleware.getValidationMiddleware());

      // Apply error handling middleware last
      app.use(this.securityMiddleware.getErrorMiddleware());

      logger.info('Security middleware applied to HTTP transport', {
        middlewares: ['response', 'rateLimit', 'auth', 'validation', 'errorHandling']
      });
    }
  }

  /**
   * Get security status
   */
  getSecurityStatus() {
    return {
      environment: this.secureOptions.environment,
      authentication: {
        enabled: this.securityMiddleware.options?.authentication?.enabled,
        methods: ['api_key', 'bearer_token']
      },
      rateLimit: {
        enabled: true,
        windowMs: this.securityMiddleware.options?.rateLimit?.windowMs,
        maxRequests: this.securityMiddleware.options?.rateLimit?.max
      },
      audit: {
        enabled: this.securityMiddleware.options?.audit?.enabled,
        logLevel: this.securityMiddleware.options?.audit?.logLevel
      },
      validation: {
        inputSanitization: this.securityMiddleware.options?.validation?.sanitizeInput,
        maxRequestSize: this.securityMiddleware.options?.validation?.maxRequestSize
      }
    };
  }

  /**
   * Enhanced shutdown with security cleanup
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down secure MCP server');

    // Log final security metrics
    logger.info('Security session summary', {
      environment: this.secureOptions.environment,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });

    await super.shutdown();
  }
}

// Start secure server if this file is run directly
if (require.main === module) {
  const environment = (process.env.NODE_ENV as 'development' | 'production') || 'development';

  const server = new SecureMermaidValidatorMCPServer({
    environment,
    http: {
      port: parseInt(process.env.MCP_HTTP_PORT || '8080'),
      host: process.env.MCP_HTTP_HOST || '0.0.0.0',
      stateful: process.env.MCP_STATEFUL === 'true'
    },
    security: {
      authentication: {
        enabled: environment === 'production' || process.env.MCP_AUTH_ENABLED === 'true'
      }
    }
  });

  process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.shutdown();
    process.exit(0);
  });

  server.startSecure().catch((error) => {
    logger.error('Secure MCP server startup failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });
}

export default SecureMermaidValidatorMCPServer;