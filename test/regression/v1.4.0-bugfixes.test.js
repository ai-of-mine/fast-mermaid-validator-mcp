#!/usr/bin/env node
/**
 * Regression tests for the v1.4.0 bugfixes.
 *
 * Each section below maps to a real bug we shipped a fix for. If a future
 * change breaks one of these, the bug is back — the test name will tell you
 * which one and the assertion message will tell you the symptom.
 *
 * Run:
 *   API_URL=http://localhost:8000 node test/regression/v1.4.0-bugfixes.test.js
 *   # or via the npm script if registered
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:8000';
const API = `${API_URL}/api/v1`;
const TIMEOUT = 30000;

const COLORS = { RED: '\x1b[31m', GREEN: '\x1b[32m', YELLOW: '\x1b[33m', NC: '\x1b[0m' };

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, condition, detail = '') {
  if (condition) {
    pass++;
    console.log(`  ${COLORS.GREEN}✓${COLORS.NC} ${name}`);
  } else {
    fail++;
    failures.push({ name, detail });
    console.log(`  ${COLORS.RED}✗${COLORS.NC} ${name}${detail ? '  — ' + detail : ''}`);
  }
}

async function postMd(content) {
  const r = await axios.post(`${API}/markdown/validate`, { content }, { timeout: TIMEOUT });
  return r.data;
}
async function postValidate(diagrams) {
  const r = await axios.post(`${API}/validate`, { diagrams }, { timeout: TIMEOUT });
  return r.data;
}
async function getCapabilities() {
  const r = await axios.get(`${API}/capabilities`, { timeout: TIMEOUT });
  return r.data;
}

function fence(body) { return '```mermaid\n' + body + '\n```'; }

async function section(title, fn) {
  console.log(`\n${COLORS.YELLOW}${title}${COLORS.NC}`);
  await fn();
}

(async () => {
  console.log(`Regression suite for v1.4.0 bugfixes — target: ${API}`);

  // -------- BUG 1: `%%` line-comments crashed 5 grammars --------
  // flow.jison and 4 others lacked the upstream skip-comment rule;
  // input like `  %% c` made the parser see `%%` as a node identifier.
  await section('%% comment handling (regression: 5 grammars used to crash)', async () => {
    const cases = [
      ['flowchart',     'flowchart TD\n  %% leading-space\n  A-->B'],
      ['flowchart col0','flowchart TD\n%% column-0\n  A-->B'],
      ['flowchart inline at end-of-content', 'flowchart TD\n  A-->B\n%% trailing'],
      ['erDiagram',     'erDiagram\n  %% c\n  USER ||--o{ ORDER : places'],
      ['mindmap',       'mindmap\n  %% c\n  root((R))'],
      ['c4',            'C4Context\n  %% c\n  title T'],
      ['quadrantChart', 'quadrantChart\n  %% c\n  title T\n  x-axis Low --> High\n  y-axis Low --> High'],
    ];
    for (const [name, body] of cases) {
      const d = await postMd(fence(body));
      const r = d.results[0];
      ok(`%% in ${name} accepted`, r && r.valid === true, r ? `got valid=${r.valid} status=${r.status}` : 'no result');
    }
  });

  // -------- BUG 2a: %%{init:...}%% directives preserved (regex strip) --------
  // The regex strip MUST NOT remove directives — the (?!\{) lookahead matters.
  // BUG 2b: detectDiagramType must skip directive lines when looking for the
  // diagram-type keyword (otherwise line 1 = directive => null type =>
  // misleading "unsupported" response for a diagram that's actually valid).
  await section('%%{init:...}%% directives: preserved AND don\'t confuse type detection', async () => {
    const body = '%%{init: {"theme":"dark"}}%%\nflowchart TD\n  A-->B';
    const d = await postMd(fence(body));
    const r = d.results[0];
    ok('flowchart with leading directive validates',
       r && r.valid === true,
       `valid=${r && r.valid} status=${r && r.status} type=${r && r.diagramType}`);
    ok('type still detected as flowchart',
       r && r.diagramType === 'flowchart',
       `got ${r && r.diagramType}`);
  });

  // -------- BUG 3: mindmap/c4/quadrant misrouted to flowchart --------
  // markdownMermaidFixer.detectDiagramType only knew 10 of 36 keywords; the
  // rest defaulted to 'flowchart' and got rejected with `Expecting 'GRAPH'`.
  await section('detectDiagramType routes to correct parser (was: defaulted to flowchart)', async () => {
    const cases = [
      ['mindmap',        'mindmap\n  root((R))',                                       'mindmap'],
      ['c4',             'C4Context\n  title T',                                       'C4Context'],
      ['quadrantChart',  'quadrantChart\n  title T\n  x-axis Low --> High\n  y-axis Low --> High', 'quadrantChart'],
      ['timeline',       'timeline\n  title T\n  2026 : e1',                           'timeline'],
      ['gitGraph',       'gitGraph\n  commit\n  branch dev\n  commit',                 'gitGraph'],
    ];
    for (const [name, body, expectedType] of cases) {
      const d = await postMd(fence(body));
      const r = d.results[0];
      ok(`${name} routed correctly`,
         r && r.diagramType === expectedType,
         `diagramType=${r && r.diagramType} valid=${r && r.valid}`);
    }
  });

  // -------- BUG 4: unknown type silently routed → misleading "Expecting GRAPH" --------
  // Fix: return valid:null, status:'unsupported' instead of routing to flowchart.
  await section('tri-state: unknown gibberish type returns unsupported (was: misleading flowchart parse error)', async () => {
    const d = await postMd(fence('foobar baz\n  A-->B'));
    const r = d.results[0];
    ok('valid is null', r.valid === null, `got ${r.valid}`);
    ok('status is "unsupported"', r.status === 'unsupported', `got ${r.status}`);
    ok('errors include unsupported_diagram_type', r.errors.some(e => e.type === 'unsupported_diagram_type'), '');
    ok('error message does NOT say "Expecting GRAPH"', !((r.errors[0] && r.errors[0].message) || '').includes("'GRAPH'"), '');
  });

  // -------- BUG 5: zenuml (declared keyword, no parser) returned valid:true silently --------
  await section('tri-state: declared-but-no-parser returns unsupported (was: silent valid:true)', async () => {
    const d = await postMd(fence('zenuml\nAlice -> Bob: hi'));
    const r = d.results[0];
    ok('zenuml NOT silently valid', r.valid !== true, `got valid=${r.valid}`);
    ok('zenuml returns null', r.valid === null, `got ${r.valid}`);
    ok('zenuml status is "unsupported"', r.status === 'unsupported', `got ${r.status}`);
    ok('diagramType still reported as zenuml', r.diagramType === 'zenuml', `got ${r.diagramType}`);
  });

  // -------- BUG 6: summary counts rolled unsupported into invalid --------
  // Mixed batch must report validDiagrams / invalidDiagrams / unsupportedDiagrams
  // as strict-true / strict-false / strict-null counts respectively.
  await section('mixed-batch summary: honest counts (was: unsupported counted as invalid)', async () => {
    const md =
      fence('flowchart TD\n  A-->B') + '\n\n' +
      fence('flowchart TD\n  A ---->>>>>>>> B') + '\n\n' +
      fence('zenuml\nAlice -> Bob') + '\n\n' +
      fence('foobar\n  A');
    const d = await postMd(md);
    ok('totalDiagrams = 4',         d.totalDiagrams === 4,         `got ${d.totalDiagrams}`);
    ok('validDiagrams = 1',         d.validDiagrams === 1,         `got ${d.validDiagrams}`);
    ok('invalidDiagrams = 1',       d.invalidDiagrams === 1,       `got ${d.invalidDiagrams}`);
    ok('unsupportedDiagrams = 2',   d.unsupportedDiagrams === 2,   `got ${d.unsupportedDiagrams}`);
    ok('field unsupportedDiagrams present (not undefined)', typeof d.unsupportedDiagrams === 'number', '');
  });

  // -------- BUG 7: /capabilities endpoint shape --------
  await section('GET /capabilities response shape', async () => {
    const c = await getCapabilities();
    ok('has validatedTypes array',   Array.isArray(c.validatedTypes), '');
    ok('has declaredTypes array',    Array.isArray(c.declaredTypes), '');
    ok('has unvalidatedTypes array', Array.isArray(c.unvalidatedTypes), '');
    ok('has counts object',          c.counts && typeof c.counts.validated === 'number', '');
    ok('flowchart is validated',     c.validatedTypes.includes('flowchart'), '');
    ok('zenuml is in unvalidated',   c.unvalidatedTypes.includes('zenuml'), 'silent-pass hazard');
    ok('exampleDiagram is in unvalidated', c.unvalidatedTypes.includes('exampleDiagram'), '');
    ok('counts.validated matches array length', c.counts.validated === c.validatedTypes.length, '');
  });

  // -------- BUG 8: /validate (direct JSON) also surfaces tri-state --------
  await section('/validate (direct JSON) surfaces tri-state on every result + summary', async () => {
    const d = await postValidate([
      { id: 'd1', content: 'flowchart TD\n  A-->B', type: 'flowchart' },
      { id: 'd2', content: 'zenuml\nAlice -> Bob',  type: 'zenuml' },
    ]);
    ok('summary has unsupportedDiagrams', typeof d.unsupportedDiagrams === 'number', `got ${d.unsupportedDiagrams}`);
    ok('summary unsupported = 1',         d.unsupportedDiagrams === 1, `got ${d.unsupportedDiagrams}`);
    ok('summary valid = 1',               d.validDiagrams === 1, `got ${d.validDiagrams}`);
    ok('summary invalid = 0',             d.invalidDiagrams === 0, `got ${d.invalidDiagrams}`);
    ok('per-result d1 has status',        d.results[0].status === 'validated', `got ${d.results[0].status}`);
    ok('per-result d2 has status',        d.results[1].status === 'unsupported', `got ${d.results[1].status}`);
  });

  // -------- Final report --------
  console.log(`\n${pass + fail} assertions: ${COLORS.GREEN}${pass} passed${COLORS.NC}, ${fail ? COLORS.RED : ''}${fail} failed${COLORS.NC}`);
  if (fail) {
    console.log(`\n${COLORS.RED}FAILED:${COLORS.NC}`);
    for (const f of failures) console.log(`  - ${f.name}${f.detail ? ': ' + f.detail : ''}`);
    process.exit(1);
  }
  process.exit(0);
})().catch(err => {
  console.error(`\n${COLORS.RED}fatal:${COLORS.NC} ${err.message}`);
  if (err.response) console.error(`  response: ${JSON.stringify(err.response.data).slice(0, 200)}`);
  process.exit(2);
});
