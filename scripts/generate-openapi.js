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

// Keep this description block in sync with src/server.js#setupSwaggerDocs.
// Kept short on purpose: the Swagger UI renders a wall-of-text poorly;
// detail belongs in README/repo docs, not the spec landing page.
const apiDescription = [
  'Validates Mermaid diagrams (~32 types) using vendored jison + langium grammars.',
  '',
  'Live list of supported types: `GET /api/v1/capabilities`',
  '',
  '### Result is tri-state',
  '',
  '| `valid` | `status` | meaning |',
  '|---|---|---|',
  '| `true` | `validated` | parsed, content OK |',
  '| `false` | `invalid` | parsed, content has errors |',
  '| `null` | `unsupported` | no parser — we could not check |',
  '',
  'Gate on `valid !== true` to keep "do not ship" behavior for both `false` and `null`.',
  '',
  '### Endpoint stability',
  '',
  '- Validators (`/validate`, `/upload/file`, `/markdown/validate`, `/health/*`, `/stats`, `/capabilities`): stable.',
  '- Auto-fixers (`/markdown/fix`, `/upload/fix`): **BETA** — heuristic rewriter, review the diff before accepting.',
  '',
  '### Notes',
  '',
  '- `%%` line-comments are stripped before parsing.',
  '- `%%{init: ...}%%` theme/layout directives are stripped before parsing (they are renderer metadata, not syntax — they do not affect whether the diagram is valid Mermaid).',
  '- Grammars are vendored snapshots, not a live wrapper around upstream `mermaid`.'
].join('\n');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mermaid Validator API',
      version: pkg.version,
      description: apiDescription,
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
          description: 'Per-diagram validation result. The `valid` field is tri-state: true = parsed cleanly; false = parsed with errors; null = the validator could not run (unknown type or no parser). The `status` field gives the same information in string form.',
          properties: {
            id: { type: 'string' },
            valid: { type: 'boolean', nullable: true, description: 'true=ok, false=invalid, null=could not validate' },
            status: { type: 'string', enum: ['validated', 'invalid', 'unsupported'], description: 'Matches the tri-state valid field' },
            diagramType: { type: 'string', nullable: true, description: 'Detected diagram type (null if undetectable)' },
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
