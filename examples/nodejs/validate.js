#!/usr/bin/env node
/**
 * Validate Mermaid diagrams via the REST API.
 *
 * Demonstrates two patterns against a running fast-mermaid-validator-mcp:
 *   A. Send raw content as JSON           -> POST /api/v1/validate
 *   B. Send a file via multipart upload   -> POST /api/v1/upload/file
 *
 * Run a server first (any of these works):
 *   npx @ai-of-mine/fast-mermaid-validator-mcp@latest
 *   podman run --rm -p 8000:8000 -p 8080:8080 docker.io/gregoriomomm/fast-mermaid-validator-mcp:latest-ubi
 *
 * Then:
 *   node examples/nodejs/validate.js                   # uses default API_URL
 *   API_URL=http://localhost:8000 node examples/nodejs/validate.js
 *
 * No external deps — uses Node 18+ built-in fetch + FormData/Blob.
 */

const fs = require('node:fs');
const path = require('node:path');

const API = process.env.API_URL || 'http://localhost:8000';

const VALID_FLOWCHART =
  'flowchart TD\n' +
  '  Start --> Decision\n' +
  '  Decision -->|yes| Done\n' +
  '  Decision -->|no| Retry\n' +
  '  Retry --> Decision';

const INVALID_FLOWCHART =
  'flowchart TD\n' +
  '  A-->\n' +
  '  -->B';

// ---------------------------------------------------------------------------
// A. JSON body  ->  POST /api/v1/validate
// ---------------------------------------------------------------------------
async function validateContent(content, diagramType = 'flowchart') {
  const res = await fetch(`${API}/api/v1/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      diagrams: [{ content, type: diagramType }]
    })
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// B. multipart upload  ->  POST /api/v1/upload/file
// ---------------------------------------------------------------------------
async function validateFile(filePath) {
  const data = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([data], { type: 'text/markdown' }), path.basename(filePath));

  const res = await fetch(`${API}/api/v1/upload/file`, { method: 'POST', body: form });
  return res.json();
}

// ---------------------------------------------------------------------------
async function main() {
  console.log(`>>> validating against ${API}\n`);

  console.log('A. JSON content — VALID flowchart');
  const a1 = await validateContent(VALID_FLOWCHART);
  console.log(`   validDiagrams=${a1.validDiagrams}  invalidDiagrams=${a1.invalidDiagrams}\n`);

  console.log('A. JSON content — INVALID flowchart (dangling arrow)');
  const a2 = await validateContent(INVALID_FLOWCHART);
  console.log(`   validDiagrams=${a2.validDiagrams}  invalidDiagrams=${a2.invalidDiagrams}`);
  console.log(`   first error: ${a2.results[0].errors[0].type}: ${a2.results[0].errors[0].message.split('\n')[0]}\n`);

  // Create temp markdown files for the upload path
  const tmpdir = require('node:os').tmpdir();
  const good = path.join(tmpdir, 'mermaid-good.md');
  const bad = path.join(tmpdir, 'mermaid-bad.md');
  fs.writeFileSync(good, '# Good\n```mermaid\n' + VALID_FLOWCHART + '\n```\n');
  fs.writeFileSync(bad, '# Bad\n```mermaid\n' + INVALID_FLOWCHART + '\n```\n');

  console.log('B. multipart upload — VALID file');
  const b1 = await validateFile(good);
  console.log(`   validDiagrams=${b1.validDiagrams}  invalidDiagrams=${b1.invalidDiagrams}\n`);

  console.log('B. multipart upload — INVALID file');
  const b2 = await validateFile(bad);
  console.log(`   validDiagrams=${b2.validDiagrams}  invalidDiagrams=${b2.invalidDiagrams}\n`);

  fs.unlinkSync(good); fs.unlinkSync(bad);
}

main().catch(err => { console.error(err); process.exit(1); });
