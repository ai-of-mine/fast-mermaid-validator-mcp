#!/usr/bin/env node
/**
 * Generate docs/openapi.json from the @swagger JSDoc blocks in src/routes/*.js
 * Mirrors the swagger-jsdoc config that src/server.js#setupSwaggerDocs assembles
 * at runtime, so the file on disk matches what /docs serves.
 *
 * Usage:
 *   node scripts/generate-openapi.js [-o <path>]
 *   npm run docs:openapi
 */
const fs = require('fs');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const pkg = require('../package.json');

const args = process.argv.slice(2);
const outIdx = args.indexOf('-o');
const outPath = outIdx !== -1 && args[outIdx + 1]
  ? path.resolve(args[outIdx + 1])
  : path.resolve(__dirname, '..', 'docs', 'openapi.json');

// Keep this in sync with src/server.js#setupSwaggerDocs
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mermaid Validator API',
      version: pkg.version,
      description: pkg.description,
      contact: pkg.author && typeof pkg.author === 'object'
        ? { name: pkg.author.name, email: pkg.author.email }
        : undefined,
      license: pkg.license ? { name: pkg.license } : undefined
    },
    servers: [
      { url: 'http://localhost:8000/api/v1', description: 'Local development server' }
    ],
    tags: [
      { name: 'health', description: 'Liveness, readiness, and detailed health probes' },
      { name: 'validation', description: 'Validate Mermaid diagrams (JSON or multipart upload)' },
      { name: 'markdown', description: 'Extract, validate, and auto-fix Mermaid diagrams inside markdown' }
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            requestId: { type: 'string', format: 'uuid' },
            timestamp: { type: 'string', format: 'date-time' }
          },
          required: ['error']
        },
        DiagramInput: {
          type: 'object',
          description: 'A single diagram to validate',
          properties: {
            id: { type: 'string', example: 'diagram_1' },
            content: { type: 'string', example: 'flowchart TD\n  A-->B' },
            type: { type: 'string', example: 'flowchart', nullable: true }
          },
          required: ['content']
        },
        ValidationError: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'syntax_error' },
            message: { type: 'string' },
            line: { type: 'integer', nullable: true }
          }
        },
        DiagramResult: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            valid: { type: 'boolean' },
            errors: { type: 'array', items: { $ref: '#/components/schemas/ValidationError' } },
            warnings: { type: 'array', items: { $ref: '#/components/schemas/ValidationError' } }
          }
        },
        MarkdownValidateResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            totalDiagrams: { type: 'integer' },
            validDiagrams: { type: 'integer' },
            invalidDiagrams: { type: 'integer' },
            results: { type: 'array', items: { $ref: '#/components/schemas/DiagramResult' } }
          }
        }
      }
    }
  },
  apis: [path.resolve(__dirname, '..', 'src', 'routes', '*.js')]
};

const spec = swaggerJsdoc(options);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(spec, null, 2) + '\n');

const pathCount = Object.keys(spec.paths || {}).length;
const opCount = Object.values(spec.paths || {}).reduce((n, ops) => n + Object.keys(ops).length, 0);
console.log(`wrote ${outPath}`);
console.log(`  version: ${spec.info.version}`);
console.log(`  paths:   ${pathCount}  (${opCount} operations)`);
