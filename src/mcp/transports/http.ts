/**
 * Streamable HTTP Transport for the Mermaid Validator MCP Server.
 *
 * Wraps the official @modelcontextprotocol/sdk StreamableHTTPServerTransport
 * in stateless mode. Each POST /mcp request is handled independently; no
 * session state is retained between requests.
 *
 * Endpoints:
 *   POST   /mcp            JSON-RPC requests (returns JSON or SSE stream
 *                           depending on the client's Accept header).
 *   GET    /mcp            SSE stream for server-initiated messages.
 *   DELETE /mcp            Session termination. In stateless mode, no-op.
 *   GET    /health         Liveness probe.
 *   GET    /info           Server metadata.
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer, Server as HttpServer } from 'http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';
import { MermaidValidatorMCPServer } from '../server.js';
const logger = require('../../../src/utils/logger');

export interface HttpTransportOptions {
  port: number;
  host?: string;
  /**
   * Stateful mode is opt-in. Default is stateless (recommended for
   * load-balanced and serverless deployments).
   */
  stateful?: boolean;
  cors?: {
    origin?: string | string[];
    credentials?: boolean;
  };
  /**
   * @deprecated Retained only for backward-compatibility with the previous
   * custom transport's option shape. The SDK Streamable HTTP transport
   * decides per-request via the Accept header.
   */
  enableSSE?: boolean;
}

export class HttpTransport {
  private app: express.Application;
  private server: HttpServer | null = null;
  private mcpServer: MermaidValidatorMCPServer;
  private options: HttpTransportOptions;
  private transport: StreamableHTTPServerTransport | null = null;

  constructor(mcpServer: MermaidValidatorMCPServer, options: HttpTransportOptions) {
    this.mcpServer = mcpServer;
    this.options = options;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const origin = this.options.cors?.origin;
      if (origin) {
        res.setHeader(
          'Access-Control-Allow-Origin',
          Array.isArray(origin) ? origin.join(',') : origin
        );
      }
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, DELETE, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Accept, mcp-session-id'
      );
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      next();
    });
  }

  /**
   * In stateless mode, each request gets a fresh transport instance + a fresh
   * McpServer connection. This is the MCP-spec-recommended pattern for true
   * statelessness, working cleanly behind load balancers / serverless runtimes.
   *
   * In stateful mode, a single shared transport is created at startup and
   * reused across requests; the SDK then propagates a session ID via the
   * `mcp-session-id` header.
   */
  private async handleMcp(req: Request, res: Response, body?: unknown): Promise<void> {
    const mcp = (this.mcpServer as any).server;
    if (this.options.stateful) {
      await this.transport!.handleRequest(req, res, body);
      return;
    }
    const perReq = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      perReq.close().catch(() => { /* noop */ });
    });
    await mcp.connect(perReq);
    await perReq.handleRequest(req, res, body);
  }

  private setupRoutes(): void {
    this.app.post('/mcp', async (req: Request, res: Response) => {
      try {
        await this.handleMcp(req, res, req.body);
      } catch (err: any) {
        logger.logError(err, { context: 'mcp-post' });
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: err?.message || 'Internal error' },
            id: (req.body as any)?.id ?? null
          });
        }
      }
    });

    this.app.get('/mcp', async (req: Request, res: Response) => {
      try {
        await this.handleMcp(req, res);
      } catch (err: any) {
        logger.logError(err, { context: 'mcp-get' });
        if (!res.headersSent) {
          res.sendStatus(500);
        }
      }
    });

    this.app.delete('/mcp', async (req: Request, res: Response) => {
      try {
        await this.handleMcp(req, res);
      } catch (err: any) {
        logger.logError(err, { context: 'mcp-delete' });
        if (!res.headersSent) {
          res.sendStatus(500);
        }
      }
    });

    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        transport: 'streamable-http',
        mode: this.options.stateful ? 'stateful' : 'stateless',
        uptime: process.uptime()
      });
    });

    this.app.get('/info', (_req: Request, res: Response) => {
      res.json({
        name: 'mermaid-validator',
        version: '1.0.0',
        transport: 'streamable-http',
        mode: this.options.stateful ? 'stateful' : 'stateless',
        spec: 'https://spec.modelcontextprotocol.io/specification/basic/transports/#streamable-http',
        endpoints: {
          mcp: '/mcp',
          health: '/health',
          info: '/info'
        }
      });
    });
  }

  async start(): Promise<void> {
    const mcp = (this.mcpServer as any).server;
    if (!mcp || typeof mcp.connect !== 'function') {
      throw new Error(
        'MermaidValidatorMCPServer is missing the underlying McpServer instance'
      );
    }

    if (this.options.stateful) {
      // One shared transport; the SDK manages session IDs internally.
      this.transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID()
      });
      await mcp.connect(this.transport);
    }
    // In stateless mode, transports are created per-request in handleMcp().

    return new Promise<void>((resolve) => {
      this.server = createServer(this.app);
      this.server.listen(this.options.port, this.options.host, () => {
        logger.info('Streamable HTTP MCP transport listening', {
          port: this.options.port,
          host: this.options.host,
          mode: this.options.stateful ? 'stateful' : 'stateless'
        });
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.transport) {
      try { await this.transport.close(); } catch (_) { /* ignore */ }
      this.transport = null;
    }
    if (this.server) {
      await new Promise<void>((resolve) => this.server!.close(() => resolve()));
      this.server = null;
    }
  }
}
