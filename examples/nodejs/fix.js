#!/usr/bin/env node
/**
 * Auto-fix Mermaid diagrams via the REST API.
 *
 * Demonstrates two patterns against a running fast-mermaid-validator-mcp:
 *   A. Send markdown content as JSON      -> POST /api/v1/markdown/fix
 *   B. Send a file via multipart upload   -> POST /api/v1/upload/fix
 *
 * Run a server first:
 *   npx @ai-of-mine/fast-mermaid-validator-mcp@latest
 *   podman run --rm -p 8000:8000 -p 8080:8080 docker.io/gregoriomomm/fast-mermaid-validator-mcp:latest-ubi
 *
 * Then:
 *   node examples/nodejs/fix.js
 *   API_URL=http://localhost:8000 node examples/nodejs/fix.js
 *
 * Both endpoints run validate -> fix -> re-validate in ONE call (up to
 * `maxIterations`, default 5). Use the response's `fixedContent` field as
 * the rewritten file body.
 */

const fs = require('node:fs');
const path = require('node:path');

const API = process.env.API_URL || 'http://localhost:8000';

const BROKEN_MARKDOWN =
  '# Architecture\n\n' +
  '```mermaid\n' +
  'flowchart TD\n' +
  '  A-->B\n' +
  '  B-->C[Label with (parens)]\n' +
  '```\n\n' +
  '```mermaid\n' +
  'flowchart TD\n' +
  '  A-->\n' +
  '  -->B\n' +
  '```\n';

const UNFIXABLE_MARKDOWN =
  '```mermaid\n' +
  'flowchart TD\n' +
  '  @@@ NOT MERMAID @@@\n' +
  '```\n';

// ---------------------------------------------------------------------------
// A. JSON body  ->  POST /api/v1/markdown/fix
// ---------------------------------------------------------------------------
async function fixContent(markdown, options = {}) {
  const res = await fetch(`${API}/api/v1/markdown/fix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: markdown, options })
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// B. multipart upload  ->  POST /api/v1/upload/fix
// ---------------------------------------------------------------------------
async function fixFile(filePath) {
  const data = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([data], { type: 'text/markdown' }), path.basename(filePath));

  const res = await fetch(`${API}/api/v1/upload/fix`, { method: 'POST', body: form });
  return res.json();
}

// ---------------------------------------------------------------------------
async function main() {
  console.log(`>>> fixing against ${API}\n`);

  console.log('A. JSON content — TWO broken diagrams (fixable)');
  const a1 = await fixContent(BROKEN_MARKDOWN);
  console.log(`   success=${a1.success}  fixedDiagrams=${a1.statistics.fixedDiagrams}  failedDiagrams=${a1.statistics.failedDiagrams}`);
  console.log('   --- fixedContent ---');
  console.log(a1.fixedContent.split('\n').map(l => '   ' + l).join('\n'));

  console.log('\nA. JSON content — UNFIXABLE garbage');
  const a2 = await fixContent(UNFIXABLE_MARKDOWN);
  console.log(`   success=${a2.success}  fixedDiagrams=${a2.statistics.fixedDiagrams}  failedDiagrams=${a2.statistics.failedDiagrams}\n`);

  // multipart upload variant — supports raw .mmd too (auto-wrapped)
  const tmpdir = require('node:os').tmpdir();
  const md = path.join(tmpdir, 'mermaid-broken.md');
  const mmd = path.join(tmpdir, 'mermaid-broken.mmd');
  fs.writeFileSync(md, BROKEN_MARKDOWN);
  fs.writeFileSync(mmd, 'flowchart TD\n  A-->B\n  B-->C[Label with (parens)]\n');

  console.log('B. multipart upload — markdown file');
  const b1 = await fixFile(md);
  console.log(`   success=${b1.success}  fileName=${b1.fileName}  wasMarkdown=${b1.wasMarkdown}  fixedDiagrams=${b1.statistics.fixedDiagrams}`);

  console.log('\nB. multipart upload — raw .mmd file (auto-wrapped, unwrapped in response)');
  const b2 = await fixFile(mmd);
  console.log(`   success=${b2.success}  fileName=${b2.fileName}  wasMarkdown=${b2.wasMarkdown}`);
  console.log('   --- fixedContent ---');
  console.log(b2.fixedContent.split('\n').map(l => '   ' + l).join('\n'));

  fs.unlinkSync(md); fs.unlinkSync(mmd);
}

main().catch(err => { console.error(err); process.exit(1); });
