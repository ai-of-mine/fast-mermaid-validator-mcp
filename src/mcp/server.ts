/**
 * Mermaid Validator MCP Server
 * Stateless MCP server for validating Mermaid diagrams
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Import existing services (CommonJS require for now)
const CustomMermaidValidator = require("../../src/services/customMermaidValidator");
const FileProcessor = require("../../src/services/fileProcessor");
const logger = require("../../src/utils/logger");
const config = require("../../src/config/config");

// Import MCP tools
import { validateDiagramsToolSchema, handleValidateDiagrams } from "./tools/validateDiagrams.js";
import { validateFilesToolSchema, handleValidateFiles } from "./tools/validateFiles.js";
import { getStatsToolSchema, handleGetStats } from "./tools/getStats.js";

export class MermaidValidatorMCPServer {
  // Public so transport implementations can `.connect()` the underlying McpServer.
  public server: McpServer;
  private validator: any;
  private fileProcessor: any;

  constructor() {
    this.server = new McpServer({
      name: "mermaid-validator",
      version: "1.0.0",
    });

    this.validator = new CustomMermaidValidator();
    this.fileProcessor = new FileProcessor();

    this.setupTools();
    this.setupResources();
  }

  /**
   * Register MCP tools
   */
  private setupTools(): void {
    // Validate Diagrams Tool
    this.server.registerTool("validate-diagrams", {
      title: "Validate Mermaid Diagrams",
      description: "Validate one or more Mermaid diagrams using grammar parsers",
      inputSchema: validateDiagramsToolSchema.shape,
    }, async (params: any) => {
      try {
        const requestId = uuidv4();
        logger.info("MCP validate-diagrams request", { requestId, diagramCount: params.diagrams?.length });

        const result = await handleValidateDiagrams(params, this.validator, this.fileProcessor);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.logError(error as Error, { context: "validate-diagrams-tool" });
        throw error;
      }
    });

    // Validate Files Tool
    this.server.registerTool("validate-files", {
      title: "Validate Mermaid Files",
      description: "Validate Mermaid diagrams from file contents (supports Markdown and ZIP)",
      inputSchema: validateFilesToolSchema.shape,
    }, async (params: any) => {
      try {
        const requestId = uuidv4();
        logger.info("MCP validate-files request", { requestId, fileCount: params.files?.length });

        const result = await handleValidateFiles(params, this.validator, this.fileProcessor);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.logError(error as Error, { context: "validate-files-tool" });
        throw error;
      }
    });

    // Get Stats Tool
    this.server.registerTool("get-validation-stats", {
      title: "Get Validation Statistics",
      description: "Get information about supported diagram types, limits, and capabilities",
      inputSchema: getStatsToolSchema.shape,
    }, async () => {
      try {
        const result = await handleGetStats(this.validator);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.logError(error as Error, { context: "get-stats-tool" });
        throw error;
      }
    });
  }

  /**
   * Register MCP resources
   */
  private setupResources(): void {
    // Server configuration resource
    this.server.registerResource(
      "config-limits",
      "config://limits",
      { title: "Validation Limits", description: "Current validation limits and configuration" },
      async () => {
      const limits = {
        maxFileSize: config.upload?.maxFileSize || "1MB",
        maxFiles: config.upload?.maxFiles || 10,
        maxDiagramsPerFile: config.validation?.maxDiagramsPerFile || 50,
        maxTotalDiagrams: config.validation?.maxTotalDiagrams || 100,
        validationTimeout: config.validation?.timeout || 30000
      };

      return {
        contents: [{
          uri: "config://limits",
          text: JSON.stringify(limits, null, 2),
          mimeType: "application/json"
        }]
      };
    });

    // Supported diagram types resource
    this.server.registerResource(
      "diagram-types",
      "info://diagram-types",
      { title: "Supported Diagram Types", description: "List of supported Mermaid diagram types" },
      async () => {
      const supportedTypes = this.validator.getSupportedTypes();

      return {
        contents: [{
          uri: "info://diagram-types",
          text: JSON.stringify({ supportedTypes }, null, 2),
          mimeType: "application/json"
        }]
      };
    });
  }

  /**
   * Start the MCP server with stdio transport
   */
  async startStdio(): Promise<void> {
    const transport = new StdioServerTransport();

    logger.info("Starting Mermaid Validator MCP Server with stdio transport", {
      serverName: "mermaid-validator",
      version: "1.0.0",
      transport: "stdio"
    });

    await this.server.connect(transport);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info("Shutting down MCP server");

    // Cleanup resources
    if (this.fileProcessor) {
      await this.fileProcessor.cleanupTempFiles();
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new MermaidValidatorMCPServer();

  process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.shutdown();
    process.exit(0);
  });

  server.startStdio().catch((error) => {
    logger.logError(error, { context: "mcp-server-startup" });
    process.exit(1);
  });
}

export default MermaidValidatorMCPServer;